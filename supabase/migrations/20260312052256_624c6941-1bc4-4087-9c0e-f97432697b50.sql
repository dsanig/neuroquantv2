
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Data Sources (FTP connections)
CREATE TABLE public.data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'IBKR Activity Statement',
  protocol TEXT NOT NULL DEFAULT 'FTP',
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 21,
  username TEXT NOT NULL,
  password_ref TEXT,
  remote_path TEXT NOT NULL DEFAULT '/',
  filename_pattern TEXT NOT NULL DEFAULT '*',
  polling_schedule TEXT NOT NULL DEFAULT '0 6 * * *',
  active BOOLEAN NOT NULL DEFAULT true,
  encrypted BOOLEAN NOT NULL DEFAULT false,
  encryption_type TEXT DEFAULT 'PGP',
  pgp_key_ref TEXT,
  pgp_passphrase_ref TEXT,
  pgp_armored BOOLEAN DEFAULT true,
  last_connected_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'unknown',
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage data_sources" ON public.data_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON public.data_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Parser Profiles
CREATE TABLE public.parser_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  source_pattern TEXT NOT NULL DEFAULT '*',
  file_type TEXT NOT NULL DEFAULT 'CSV',
  delimiter TEXT NOT NULL DEFAULT ',',
  header_row INTEGER NOT NULL DEFAULT 1,
  skip_rows INTEGER NOT NULL DEFAULT 0,
  date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
  numeric_format TEXT NOT NULL DEFAULT 'US',
  encoding TEXT NOT NULL DEFAULT 'UTF-8',
  skip_condition TEXT,
  header_detection TEXT DEFAULT 'auto-detect from row 1',
  date_parsing_rule TEXT,
  numeric_parsing_rule TEXT DEFAULT 'strip commas, parse as float',
  validation_rules TEXT,
  dedup_key TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parser_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage parser_profiles" ON public.parser_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_parser_profiles_updated_at BEFORE UPDATE ON public.parser_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mapping Rules
CREATE TABLE public.mapping_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.parser_profiles(id) ON DELETE CASCADE,
  destination_table TEXT NOT NULL,
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'string',
  required BOOLEAN NOT NULL DEFAULT false,
  default_value TEXT,
  transform TEXT,
  validation TEXT,
  dedup_behavior TEXT NOT NULL DEFAULT 'skip',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mapping_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage mapping_rules" ON public.mapping_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_mapping_rules_updated_at BEFORE UPDATE ON public.mapping_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Import Batches
CREATE TABLE public.import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  parser_profile_id UUID REFERENCES public.parser_profiles(id) ON DELETE SET NULL,
  parser_profile_name TEXT NOT NULL,
  mapping_version TEXT NOT NULL DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'pending',
  imported_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  total_rows INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  raw_file_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage import_batches" ON public.import_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_import_batches_updated_at BEFORE UPDATE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Import Errors
CREATE TABLE public.import_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  field TEXT NOT NULL,
  message TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage import_errors" ON public.import_errors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Raw Rows
CREATE TABLE public.raw_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.raw_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage raw_rows" ON public.raw_rows FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Normalized Records
CREATE TABLE public.normalized_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  destination_table TEXT NOT NULL,
  mapped_data JSONB NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'valid',
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.normalized_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage normalized_records" ON public.normalized_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Audit Log
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor TEXT NOT NULL DEFAULT 'system',
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  source TEXT NOT NULL DEFAULT 'system',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read audit_log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX idx_import_batches_source_id ON public.import_batches(source_id);
CREATE INDEX idx_import_batches_status ON public.import_batches(status);
CREATE INDEX idx_import_errors_batch_id ON public.import_errors(batch_id);
CREATE INDEX idx_raw_rows_batch_id ON public.raw_rows(batch_id);
CREATE INDEX idx_normalized_records_batch_id ON public.normalized_records(batch_id);
CREATE INDEX idx_mapping_rules_profile_id ON public.mapping_rules(profile_id);
CREATE INDEX idx_audit_log_event_type ON public.audit_log(event_type);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
