import { MetricCard } from "@/components/MetricCard";
import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { useExternalQuery } from "@/hooks/use-analytics";

function num(v: unknown): number { const n = Number(v); return isNaN(n) ? 0 : n; }
function fmtC(v: unknown): string { const n = num(v); return n >= 0 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }

export default function MarginPage() {
  // Try to read margin data from open_position_summary or post
  const margin = useExternalQuery(['margin-summary'], `
    SELECT * FROM open_position_summary LIMIT 50
  `);

  // Also try concentration for assignment/collateral analysis
  const exposure = useExternalQuery(['margin-exposure'], `
    SELECT symbol, sum(abs(notional_value)) as notional, sum(margin_requirement) as margin_req
    FROM open_positions_data
    WHERE asset_class IN ('OPT','Option')
    GROUP BY symbol
    ORDER BY sum(abs(notional_value)) DESC
    LIMIT 30
  `);

  const marginRows = (margin.data || []) as Record<string, unknown>[];
  const expRows = (exposure.data || []) as Record<string, unknown>[];
  const isLoading = margin.isLoading;

  if (isLoading || (margin.isError && exposure.isError)) {
    return (
      <div className="page-container">
        <div className="section-header"><h1 className="section-title">Margin</h1></div>
        <DataStatusBanner isLoading={isLoading} isError={margin.isError} error={margin.error as Error} isEmpty={false} moduleName="Margin" requiredTables={['open_position_summary', 'open_positions_data']} />
      </div>
    );
  }

  const autoCols = (rows: Record<string, unknown>[]) => {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
  };

  return (
    <div className="page-container">
      <div className="section-header"><h1 className="section-title">Margin</h1></div>

      {marginRows.length > 0 && (
        <div className="metric-card">
          <div className="metric-label mb-3">Position Summary</div>
          <DataTable columns={autoCols(marginRows)} data={marginRows} stickyHeader />
        </div>
      )}

      {expRows.length > 0 && (
        <div className="metric-card">
          <div className="metric-label mb-3">Options Margin by Symbol</div>
          <DataTable
            columns={[
              { key: 'symbol', label: 'Symbol', className: 'font-sans text-foreground font-medium' },
              { key: 'notional', label: 'Notional', align: 'right' as const, format: (v: unknown) => fmtC(v) },
              { key: 'margin_req', label: 'Margin Req', align: 'right' as const, format: (v: unknown) => fmtC(v) },
            ]}
            data={expRows}
            stickyHeader
          />
        </div>
      )}

      {!marginRows.length && !expRows.length && (
        <DataStatusBanner isLoading={false} isError={false} isEmpty moduleName="Margin" />
      )}
    </div>
  );
}
