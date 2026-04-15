
-- =============================================
-- PHASE 1 SCHEMA MIGRATION
-- =============================================

-- 1. EXCHANGES
CREATE TABLE public.exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mic text NOT NULL UNIQUE,
  name text NOT NULL,
  country text,
  currency text NOT NULL DEFAULT 'EUR',
  timezone text NOT NULL DEFAULT 'Europe/Berlin',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage exchanges" ON public.exchanges FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_exchanges_updated_at BEFORE UPDATE ON public.exchanges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. SECTORS
CREATE TABLE public.sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage sectors" ON public.sectors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default sectors
INSERT INTO public.sectors (name, display_order) VALUES
  ('Information Technology', 1),
  ('Financial', 2),
  ('Health Care', 3),
  ('Consumer Discretionary', 4),
  ('Consumer Staples', 5),
  ('Communication Services', 6),
  ('Industrials', 7),
  ('Energy', 8),
  ('Materials', 9),
  ('Real Estate', 10),
  ('Utilities', 11);

-- 3. INSTRUMENTS
CREATE TABLE public.instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isin text,
  company_name text NOT NULL,
  internal_symbol text,
  asset_class text NOT NULL DEFAULT 'Stock',
  country text,
  exchange_mic text,
  currency text NOT NULL DEFAULT 'EUR',
  multiplier numeric NOT NULL DEFAULT 100,
  sector_id uuid REFERENCES public.sectors(id),
  google_finance_symbol text,
  mapping_status text NOT NULL DEFAULT 'unmapped',
  preferred_listing boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage instruments" ON public.instruments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_instruments_updated_at BEFORE UPDATE ON public.instruments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_instruments_isin ON public.instruments (isin);
CREATE INDEX idx_instruments_google_symbol ON public.instruments (google_finance_symbol);
CREATE INDEX idx_instruments_mapping_status ON public.instruments (mapping_status);

-- 4. SYMBOL_MAPPINGS
CREATE TABLE public.symbol_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  provider_symbol text NOT NULL,
  preferred boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(instrument_id, provider_name)
);
ALTER TABLE public.symbol_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage symbol_mappings" ON public.symbol_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_symbol_mappings_updated_at BEFORE UPDATE ON public.symbol_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. MARKET_DATA_PROVIDERS
CREATE TABLE public.market_data_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  provider_type text NOT NULL DEFAULT 'api',
  enabled boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 50,
  api_key_ref text,
  config jsonb NOT NULL DEFAULT '{}',
  region_coverage text[] NOT NULL DEFAULT '{}',
  asset_class_coverage text[] NOT NULL DEFAULT '{}',
  exchange_restrictions text[] NOT NULL DEFAULT '{}',
  allowed_currencies text[] NOT NULL DEFAULT '{}',
  use_cases text[] NOT NULL DEFAULT '{}',
  cache_duration_seconds integer NOT NULL DEFAULT 300,
  retry_max integer NOT NULL DEFAULT 3,
  rate_limit_per_minute integer,
  stale_threshold_seconds integer NOT NULL DEFAULT 900,
  health_status text NOT NULL DEFAULT 'unknown',
  last_error text,
  last_successful_fetch timestamptz,
  last_error_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.market_data_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage market_data_providers" ON public.market_data_providers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_market_data_providers_updated_at BEFORE UPDATE ON public.market_data_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default providers
INSERT INTO public.market_data_providers (name, provider_type, enabled, priority, use_cases) VALUES
  ('Google Finance', 'bridge', true, 10, ARRAY['current_stock_price','historical_stock_price']),
  ('Yahoo Finance', 'api', false, 20, ARRAY['current_stock_price','historical_stock_price','dividends','fundamentals']),
  ('Alpha Vantage', 'api', false, 30, ARRAY['current_stock_price','historical_stock_price','fundamentals']),
  ('Twelve Data', 'api', false, 40, ARRAY['current_stock_price','historical_stock_price','fx_rates']),
  ('Stooq', 'api', false, 50, ARRAY['historical_stock_price']),
  ('ECB FX', 'api', true, 10, ARRAY['fx_rates']),
  ('IBKR', 'broker_api', false, 15, ARRAY['current_stock_price','option_metadata','greeks','positions','balances']),
  ('Generic REST', 'custom', false, 90, ARRAY[]::text[]),
  ('Generic CSV/URL', 'custom', false, 91, ARRAY[]::text[]),
  ('Manual Input', 'manual', true, 99, ARRAY['current_stock_price','fx_rates','dividends','option_metadata','greeks','sector_metadata']);

-- 6. SOURCE_PRIORITY_RULES
CREATE TABLE public.source_priority_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_domain text NOT NULL,
  priority_order integer NOT NULL DEFAULT 0,
  provider_id uuid NOT NULL REFERENCES public.market_data_providers(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_domain, priority_order)
);
ALTER TABLE public.source_priority_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage source_priority_rules" ON public.source_priority_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_source_priority_rules_updated_at BEFORE UPDATE ON public.source_priority_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. MARKET_DATA_CACHE
CREATE TABLE public.market_data_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid REFERENCES public.instruments(id) ON DELETE CASCADE,
  data_domain text NOT NULL,
  provider_name text NOT NULL,
  symbol_queried text,
  value jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  source_timestamp timestamptz,
  is_delayed boolean NOT NULL DEFAULT false,
  is_stale boolean NOT NULL DEFAULT false,
  raw_response jsonb,
  fallback_chain_attempted text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage market_data_cache" ON public.market_data_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_market_data_cache_instrument ON public.market_data_cache (instrument_id, data_domain);
CREATE INDEX idx_market_data_cache_fetched ON public.market_data_cache (fetched_at DESC);

-- 8. APP_SETTINGS
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage app_settings" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings
INSERT INTO public.app_settings (key, value, category, description) VALUES
  ('fee_per_contract', '1.25', 'fees', 'Default fee per options contract'),
  ('estimated_tax_rate', '0.25', 'tax', 'Estimated tax rate for P/L projections'),
  ('reporting_currency', '"EUR"', 'general', 'Base reporting currency'),
  ('cash_reserve_target', '0.20', 'liquidity', 'Target cash reserve as fraction of capital'),
  ('max_single_position', '0.33', 'concentration', 'Max single position as fraction of capital'),
  ('max_sector_concentration', '0.33', 'concentration', 'Max sector concentration as fraction of capital'),
  ('timezone', '"Europe/Berlin"', 'general', 'Application timezone'),
  ('date_format', '"YYYY-MM-DD"', 'general', 'Display date format'),
  ('allow_delayed_quotes', 'true', 'data', 'Allow delayed market data quotes'),
  ('quote_staleness_threshold_minutes', '30', 'data', 'Minutes before a quote is considered stale'),
  ('recompute_on_refresh', 'true', 'compute', 'Trigger recomputation on data refresh'),
  ('default_multiplier', '100', 'trading', 'Default options contract multiplier'),
  ('stress_scenario_moderate', '-0.10', 'stress', 'Moderate stress scenario shock'),
  ('stress_scenario_severe', '-0.20', 'stress', 'Severe stress scenario shock'),
  ('stress_scenario_black_swan', '-0.35', 'stress', 'Black swan stress scenario shock');

-- 9. FEE_SCHEDULES
CREATE TABLE public.fee_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  strategy_type text NOT NULL,
  fee_per_contract numeric NOT NULL DEFAULT 1.25,
  per_leg boolean NOT NULL DEFAULT true,
  min_fee numeric,
  max_fee numeric,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage fee_schedules" ON public.fee_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_fee_schedules_updated_at BEFORE UPDATE ON public.fee_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.fee_schedules (name, strategy_type, fee_per_contract, per_leg) VALUES
  ('Default CSP Fees', 'CSP', 1.25, true),
  ('Default CC Fees', 'CC', 1.25, true),
  ('Default Iron Condor Fees', 'Iron Condor', 1.25, true);

-- 10. TAX_PROFILES
CREATE TABLE public.tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate numeric NOT NULL DEFAULT 0.25,
  applicable_strategies text[] NOT NULL DEFAULT ARRAY['CSP','CC','Iron Condor'],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tax_profiles" ON public.tax_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_tax_profiles_updated_at BEFORE UPDATE ON public.tax_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tax_profiles (name, rate) VALUES ('Default', 0.25);

-- 11. WHEEL_CAMPAIGNS
CREATE TABLE public.wheel_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  underlying text NOT NULL,
  instrument_id uuid REFERENCES public.instruments(id),
  status text NOT NULL DEFAULT 'Open',
  campaign_start date NOT NULL,
  campaign_end date,
  roll_count integer NOT NULL DEFAULT 0,
  assignment_flag boolean NOT NULL DEFAULT false,
  called_away_flag boolean NOT NULL DEFAULT false,
  notes text,
  account text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wheel_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage wheel_campaigns" ON public.wheel_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_wheel_campaigns_updated_at BEFORE UPDATE ON public.wheel_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_wheel_campaigns_underlying ON public.wheel_campaigns (underlying);
CREATE INDEX idx_wheel_campaigns_status ON public.wheel_campaigns (status);

-- 12. WHEEL_TRADES
CREATE TABLE public.wheel_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_date date NOT NULL,
  underlying text NOT NULL,
  instrument_id uuid REFERENCES public.instruments(id),
  isin text,
  trade_type text NOT NULL DEFAULT 'CSP',
  sector_id uuid REFERENCES public.sectors(id),
  contracts integer NOT NULL DEFAULT 1,
  strike numeric NOT NULL,
  expiration_date date NOT NULL,
  delta_at_entry numeric,
  premium_per_share numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Open',
  close_date date,
  premium_paid_to_close numeric DEFAULT 0,
  exchange_mic text,
  currency text NOT NULL DEFAULT 'EUR',
  multiplier numeric NOT NULL DEFAULT 100,
  broker_trade_id text,
  account text,
  campaign_id uuid REFERENCES public.wheel_campaigns(id),
  stock_cost_basis numeric,
  notes text,
  import_batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wheel_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage wheel_trades" ON public.wheel_trades FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_wheel_trades_updated_at BEFORE UPDATE ON public.wheel_trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_wheel_trades_underlying ON public.wheel_trades (underlying);
CREATE INDEX idx_wheel_trades_campaign ON public.wheel_trades (campaign_id);
CREATE INDEX idx_wheel_trades_status ON public.wheel_trades (status);
CREATE INDEX idx_wheel_trades_date ON public.wheel_trades (trade_date DESC);

-- 13. WHEEL_CAMPAIGN_EVENTS
CREATE TABLE public.wheel_campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.wheel_campaigns(id) ON DELETE CASCADE,
  trade_id uuid REFERENCES public.wheel_trades(id),
  event_type text NOT NULL,
  event_date date NOT NULL,
  description text,
  premium_impact numeric DEFAULT 0,
  capital_impact numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wheel_campaign_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage wheel_campaign_events" ON public.wheel_campaign_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_campaign_events_campaign ON public.wheel_campaign_events (campaign_id);

-- 14. CONDOR_TRADES
CREATE TABLE public.condor_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_date date NOT NULL,
  underlying text NOT NULL,
  instrument_id uuid REFERENCES public.instruments(id),
  isin text,
  contracts integer NOT NULL DEFAULT 1,
  expiration_date date NOT NULL,
  short_call_strike numeric NOT NULL,
  long_call_strike numeric NOT NULL,
  short_put_strike numeric NOT NULL,
  long_put_strike numeric NOT NULL,
  premium_per_share numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Open',
  close_date date,
  premium_paid_to_close numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  exchange_mic text,
  multiplier numeric NOT NULL DEFAULT 100,
  broker_trade_ids text[],
  account text,
  notes text,
  import_batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.condor_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage condor_trades" ON public.condor_trades FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_condor_trades_updated_at BEFORE UPDATE ON public.condor_trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_condor_trades_date ON public.condor_trades (trade_date DESC);
CREATE INDEX idx_condor_trades_status ON public.condor_trades (status);

-- 15. CAPITAL_LEDGER
CREATE TABLE public.capital_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  action_type text NOT NULL,
  amount numeric NOT NULL,
  running_balance numeric,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  account text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.capital_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage capital_ledger" ON public.capital_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_capital_ledger_updated_at BEFORE UPDATE ON public.capital_ledger FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_capital_ledger_date ON public.capital_ledger (event_date DESC);

-- 16. MANUAL_OVERRIDES
CREATE TABLE public.manual_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_domain text NOT NULL,
  instrument_id uuid REFERENCES public.instruments(id),
  field_name text NOT NULL,
  override_value jsonb NOT NULL,
  reason text NOT NULL,
  effective_start timestamptz NOT NULL DEFAULT now(),
  effective_end timestamptz,
  replace_behavior text NOT NULL DEFAULT 'replace',
  actor text NOT NULL DEFAULT 'system',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage manual_overrides" ON public.manual_overrides FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_manual_overrides_updated_at BEFORE UPDATE ON public.manual_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_manual_overrides_domain ON public.manual_overrides (data_domain, active);
