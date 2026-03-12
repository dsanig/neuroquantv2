-- External PostgreSQL connections managed by NeuroQuant (populated data is handled by n8n/backend).
CREATE TABLE IF NOT EXISTS public.database_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 5432,
  database_name TEXT NOT NULL,
  username TEXT NOT NULL,
  password_secret TEXT NOT NULL,
  schema_name TEXT,
  ssl_mode TEXT NOT NULL DEFAULT 'disable',
  active BOOLEAN NOT NULL DEFAULT true,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_status TEXT NOT NULL DEFAULT 'idle',
  last_connected_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dataset_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.database_connections(id) ON DELETE CASCADE,
  dataset_key TEXT NOT NULL,
  schema_name TEXT NOT NULL DEFAULT 'public',
  table_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, dataset_key)
);

ALTER TABLE public.database_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage database_connections" ON public.database_connections;
CREATE POLICY "Authenticated users can manage database_connections"
ON public.database_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage dataset_mappings" ON public.dataset_mappings;
CREATE POLICY "Authenticated users can manage dataset_mappings"
ON public.dataset_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_database_connections_updated_at ON public.database_connections;
CREATE TRIGGER update_database_connections_updated_at
BEFORE UPDATE ON public.database_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_dataset_mappings_updated_at ON public.dataset_mappings;
CREATE TRIGGER update_dataset_mappings_updated_at
BEFORE UPDATE ON public.dataset_mappings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
