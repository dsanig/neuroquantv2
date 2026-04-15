import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// App Settings
export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useAppSetting(key: string) {
  const { data } = useAppSettings();
  if (!data) return undefined;
  const row = data.find((s: any) => s.key === key);
  if (!row) return undefined;
  try { return JSON.parse(String(row.value)); } catch { return row.value; }
}

export function useUpsertAppSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value, category, description }: { key: string; value: any; category?: string; description?: string }) => {
      const { error } = await supabase.from('app_settings').upsert(
        { key, value: JSON.stringify(value), category: category || 'general', description },
        { onConflict: 'key' }
      );
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-settings'] }); toast.success('Setting saved'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Sectors
export function useSectors() {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sectors').select('*').order('display_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sector: { id?: string; name: string; display_order?: number; active?: boolean }) => {
      const { error } = await supabase.from('sectors').upsert(sector as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sectors'] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Fee Schedules
export function useFeeSchedules() {
  return useQuery({
    queryKey: ['fee-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fee_schedules').select('*').order('strategy_type');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertFeeSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fee: any) => {
      const { error } = await supabase.from('fee_schedules').upsert(fee);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fee-schedules'] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Tax Profiles
export function useTaxProfiles() {
  return useQuery({
    queryKey: ['tax-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tax_profiles').select('*');
      if (error) throw error;
      return data;
    },
  });
}

// Market Data Providers
export function useMarketDataProviders() {
  return useQuery({
    queryKey: ['market-data-providers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('market_data_providers').select('*').order('priority');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: any) => {
      const { error } = await supabase.from('market_data_providers').upsert(provider);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['market-data-providers'] }); toast.success('Provider updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Source Priority Rules
export function useSourcePriorityRules() {
  return useQuery({
    queryKey: ['source-priority-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('source_priority_rules').select('*, market_data_providers(name)').order('data_domain').order('priority_order');
      if (error) throw error;
      return data;
    },
  });
}

// Instruments
export function useInstruments(filters?: { mapping_status?: string; search?: string }) {
  return useQuery({
    queryKey: ['instruments', filters],
    queryFn: async () => {
      let q = supabase.from('instruments').select('*, sectors(name)').order('company_name');
      if (filters?.mapping_status && filters.mapping_status !== 'all') {
        q = q.eq('mapping_status', filters.mapping_status);
      }
      if (filters?.search) {
        q = q.or(`company_name.ilike.%${filters.search}%,isin.ilike.%${filters.search}%,internal_symbol.ilike.%${filters.search}%,google_finance_symbol.ilike.%${filters.search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertInstrument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instrument: any) => {
      const { error } = await supabase.from('instruments').upsert(instrument);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['instruments'] }); toast.success('Instrument saved'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Wheel Trades
export function useWheelTrades(filters?: { status?: string; underlying?: string }) {
  return useQuery({
    queryKey: ['wheel-trades', filters],
    queryFn: async () => {
      let q = supabase.from('wheel_trades').select('*, wheel_campaigns(underlying, status), sectors(name)').order('trade_date', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.underlying) q = q.ilike('underlying', `%${filters.underlying}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertWheelTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trade: any) => {
      const { error } = await supabase.from('wheel_trades').upsert(trade);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wheel-trades'] });
      qc.invalidateQueries({ queryKey: ['wheel-campaigns'] });
      toast.success('Trade saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Wheel Campaigns
export function useWheelCampaigns(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['wheel-campaigns', filters],
    queryFn: async () => {
      let q = supabase.from('wheel_campaigns').select('*').order('campaign_start', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useWheelCampaignWithTrades(campaignId: string) {
  return useQuery({
    queryKey: ['wheel-campaign-detail', campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const [campRes, tradesRes, eventsRes] = await Promise.all([
        supabase.from('wheel_campaigns').select('*').eq('id', campaignId).single(),
        supabase.from('wheel_trades').select('*, sectors(name)').eq('campaign_id', campaignId).order('trade_date'),
        supabase.from('wheel_campaign_events').select('*').eq('campaign_id', campaignId).order('event_date'),
      ]);
      if (campRes.error) throw campRes.error;
      return { campaign: campRes.data, trades: tradesRes.data || [], events: eventsRes.data || [] };
    },
  });
}

// Condor Trades
export function useCondorTrades(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['condor-trades', filters],
    queryFn: async () => {
      let q = supabase.from('condor_trades').select('*').order('trade_date', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCondorTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trade: any) => {
      const { error } = await supabase.from('condor_trades').upsert(trade);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['condor-trades'] }); toast.success('Condor trade saved'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Capital Ledger
export function useCapitalLedger() {
  return useQuery({
    queryKey: ['capital-ledger'],
    queryFn: async () => {
      const { data, error } = await supabase.from('capital_ledger').select('*').order('event_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useInsertCapitalEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: any) => {
      const { error } = await supabase.from('capital_ledger').insert(event);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['capital-ledger'] }); toast.success('Capital event added'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Manual Overrides
export function useManualOverrides() {
  return useQuery({
    queryKey: ['manual-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase.from('manual_overrides').select('*').eq('active', true).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Exchanges
export function useExchanges() {
  return useQuery({
    queryKey: ['exchanges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exchanges').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}
