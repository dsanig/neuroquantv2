import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Core: run a read-only SQL query against the external PostgreSQL
// ---------------------------------------------------------------------------
export interface QueryResult {
  success: boolean;
  rows: Record<string, unknown>[];
  rowCount: number;
  error?: string;
}

async function runExternalQuery(
  connectionId: string,
  query: string,
  params?: unknown[],
): Promise<QueryResult> {
  const { data, error } = await supabase.functions.invoke('postgres-ops', {
    body: { action: 'run_query', connectionId, query, params },
  });
  if (error) throw error;
  if (!data.success) throw new Error(data.error || 'Query failed');
  return data as QueryResult;
}

// ---------------------------------------------------------------------------
// Hook: active connection id (stored in localStorage)
// ---------------------------------------------------------------------------
const CONN_KEY = 'nq_active_connection_id';

export function getActiveConnectionId(): string | null {
  return localStorage.getItem(CONN_KEY);
}

export function setActiveConnectionId(id: string) {
  localStorage.setItem(CONN_KEY, id);
}

// ---------------------------------------------------------------------------
// Generic query hook against external PG
// ---------------------------------------------------------------------------
export function useExternalQuery<T = Record<string, unknown>[]>(
  key: string[],
  query: string,
  options?: {
    enabled?: boolean;
    params?: unknown[];
    transform?: (rows: Record<string, unknown>[]) => T;
    connectionId?: string;
  },
) {
  const connId = options?.connectionId || getActiveConnectionId();
  return useQuery({
    queryKey: [...key, connId],
    enabled: !!connId && (options?.enabled !== false),
    queryFn: async (): Promise<T> => {
      const result = await runExternalQuery(connId!, query, options?.params);
      if (options?.transform) return options.transform(result.rows);
      return result.rows as unknown as T;
    },
    staleTime: 60_000,
    retry: 1,
  });
}

// ---------------------------------------------------------------------------
// Hook: run ad-hoc query mutation
// ---------------------------------------------------------------------------
export function useRunExternalQuery() {
  return useMutation({
    mutationFn: async ({ connectionId, query, params }: { connectionId: string; query: string; params?: unknown[] }) => {
      return runExternalQuery(connectionId, query, params);
    },
    onError: (e: Error) => toast.error(`Query failed: ${e.message}`),
  });
}

// ---------------------------------------------------------------------------
// Hook: fetch external data from approved providers
// ---------------------------------------------------------------------------
export function useExternalData(provider: string, params: Record<string, string>, enabled = true) {
  return useQuery({
    queryKey: ['external-data', provider, JSON.stringify(params)],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('external-data', {
        body: { provider, params },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Provider fetch failed');
      return data;
    },
    staleTime: 300_000, // 5 min cache
    retry: 1,
  });
}

// ---------------------------------------------------------------------------
// NEUROQUANT DATASET QUERIES
// These build SQL from dataset_mappings or use well-known NeuroQuant tables
// ---------------------------------------------------------------------------

/** Get the mapped table name for a dataset key, or fall back to a default */
export function useDatasetMapping(datasetKey: string) {
  const connId = getActiveConnectionId();
  return useQuery({
    queryKey: ['dataset-mapping', datasetKey, connId],
    enabled: !!connId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dataset_mappings')
        .select('*')
        .eq('connection_id', connId!)
        .eq('dataset_key', datasetKey)
        .eq('active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Pre-built analytics queries for the NeuroQuant schema
// ---------------------------------------------------------------------------

/** NAV / Account Summary from cnav or change_in_nav */
export function useNAVSummary() {
  return useExternalQuery(
    ['nav-summary'],
    `SELECT * FROM cnav ORDER BY report_date DESC LIMIT 1`,
    {
      transform: (rows) => rows[0] || null,
    },
  );
}

/** Open positions from open_positions_data or post */
export function useOpenPositions() {
  return useExternalQuery(
    ['open-positions'],
    `SELECT * FROM open_positions_data ORDER BY symbol`,
  );
}

/** All trades from trnt or trades_data */
export function useTrades(limit = 500) {
  return useExternalQuery(
    ['trades', String(limit)],
    `SELECT * FROM trnt ORDER BY trade_date DESC, trade_time DESC LIMIT ${Math.min(limit, 2000)}`,
  );
}

/** Greeks aggregation from greeks table */
export function useGreeks() {
  return useExternalQuery(
    ['greeks'],
    `SELECT * FROM greeks ORDER BY symbol`,
  );
}

/** Cash report */
export function useCashReport() {
  return useExternalQuery(
    ['cash-report'],
    `SELECT * FROM cash_report ORDER BY currency`,
  );
}

/** Income / dividends / interest */
export function useIncomeEvents() {
  return useExternalQuery(
    ['income-events'],
    `SELECT * FROM (
      SELECT 'dividend' as income_type, * FROM open_dividend_accruals
      UNION ALL
      SELECT 'interest' as income_type, * FROM interest_details
    ) combined ORDER BY 1 LIMIT 500`,
  );
}

/** Performance summary */
export function usePerformanceSummary() {
  return useExternalQuery(
    ['performance-summary'],
    `SELECT * FROM key_statistics LIMIT 50`,
  );
}

/** Risk measures */
export function useRiskMeasures() {
  return useExternalQuery(
    ['risk-measures'],
    `SELECT * FROM risk_measures ORDER BY 1 LIMIT 50`,
  );
}

/** Concentration data */
export function useConcentration(dimension: string) {
  const table = `concentration_${dimension}`;
  return useExternalQuery(
    ['concentration', dimension],
    `SELECT * FROM ${table} ORDER BY 1 LIMIT 100`,
  );
}

/** Allocation data */
export function useAllocation(dimension: string) {
  const table = `allocation_by_${dimension}`;
  return useExternalQuery(
    ['allocation', dimension],
    `SELECT * FROM ${table} ORDER BY 1 LIMIT 100`,
  );
}

/** Commission details */
export function useCommissions() {
  return useExternalQuery(
    ['commissions'],
    `SELECT * FROM commission_details ORDER BY 1 DESC LIMIT 200`,
  );
}

/** Financial instrument info */
export function useInstrumentInfo() {
  return useExternalQuery(
    ['instrument-info'],
    `SELECT * FROM financial_instrument_information_basic ORDER BY symbol LIMIT 500`,
  );
}

/** Mark to market P&L */
export function useMTMPnL() {
  return useExternalQuery(
    ['mtm-pnl'],
    `SELECT * FROM mtm_pnl_on_previous_days_positions ORDER BY symbol LIMIT 500`,
  );
}

/** Historical performance */
export function useHistoricalPerformance(period: 'month' | 'quarter' | 'year') {
  return useExternalQuery(
    ['historical-performance', period],
    `SELECT * FROM historical_performance_annualized_${period} ORDER BY 1`,
  );
}

/** Statement of funds */
export function useStatementOfFunds() {
  return useExternalQuery(
    ['statement-of-funds'],
    `SELECT * FROM statement_of_funds ORDER BY 1 LIMIT 200`,
  );
}

/** Projected income */
export function useProjectedIncome() {
  return useExternalQuery(
    ['projected-income'],
    `SELECT * FROM projected_income ORDER BY 1 LIMIT 200`,
  );
}

/** Options distribution by expiration */
export function useOptionsDistribution() {
  return useExternalQuery(
    ['options-distribution'],
    `SELECT * FROM options_distribution_by_expiration ORDER BY 1`,
  );
}

/** Net positions from netp */
export function useNetPositions() {
  return useExternalQuery(
    ['net-positions'],
    `SELECT * FROM netp ORDER BY symbol LIMIT 500`,
  );
}

/** Trade summary by symbol */
export function useTradeSummaryBySymbol() {
  return useExternalQuery(
    ['trade-summary-symbol'],
    `SELECT * FROM trade_summary_by_symbol ORDER BY 1 LIMIT 200`,
  );
}

/** Trade summary by asset class */
export function useTradeSummaryByAssetClass() {
  return useExternalQuery(
    ['trade-summary-asset-class'],
    `SELECT * FROM trade_summary_by_asset_class ORDER BY 1`,
  );
}

/** FIFO P&L */
export function useFIFO() {
  return useExternalQuery(
    ['fifo-pnl'],
    `SELECT * FROM fifo ORDER BY symbol LIMIT 500`,
  );
}

/** Realized/unrealized performance summary */
export function useRealizedUnrealizedSummary() {
  return useExternalQuery(
    ['realized-unrealized'],
    `SELECT * FROM realized_unrealized_performance_summary ORDER BY 1 LIMIT 100`,
  );
}
