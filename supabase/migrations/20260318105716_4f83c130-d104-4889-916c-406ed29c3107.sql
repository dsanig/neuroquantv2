
-- database_connections: external PostgreSQL connection profiles
CREATE TABLE public.database_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 5432,
  database_name text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  password_secret text,
  schema_name text DEFAULT 'public',
  ssl_mode text NOT NULL DEFAULT 'disable',
  active boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  last_status text NOT NULL DEFAULT 'unknown',
  last_connected_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.database_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage database_connections" ON public.database_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_database_connections_updated_at BEFORE UPDATE ON public.database_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- dataset_mappings: maps canonical dataset keys to external PG tables
CREATE TABLE public.dataset_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.database_connections(id) ON DELETE CASCADE,
  dataset_key text NOT NULL,
  schema_name text NOT NULL DEFAULT 'public',
  table_name text NOT NULL,
  column_mappings jsonb DEFAULT '{}',
  transform_rules jsonb DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, dataset_key)
);

ALTER TABLE public.dataset_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage dataset_mappings" ON public.dataset_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_dataset_mappings_updated_at BEFORE UPDATE ON public.dataset_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
