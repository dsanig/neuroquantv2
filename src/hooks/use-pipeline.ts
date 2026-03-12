import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function isPermissionError(message?: string) {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('row-level security') || normalized.includes('permission denied') || normalized.includes('not allowed');
}

async function requireAuthenticatedSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw new Error('SESSION_NOT_READY');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('SESSION_NOT_READY');
  }

  return userData.user;
}

export type DatabaseConnection = {
  id: string;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  schema_name: string | null;
  ssl_mode: string;
  active: boolean;
  enabled: boolean;
  last_status: string;
  last_connected_at: string | null;
  last_error: string | null;
};

export type DatasetMapping = {
  id: string;
  dataset_key: string;
  connection_id: string;
  schema_name: string;
  table_name: string;
  active: boolean;
  notes: string | null;
};

export type PostgresFunctionResponse = {
  success: boolean;
  error?: string;
  message?: string;
  schemas?: string[];
  tables?: Array<{ schema: string; table: string; rowCount?: number | null }>;
  columns?: Array<{ name: string; dataType: string }>;
  rows?: Array<Record<string, unknown>>;
};

// ===== External PostgreSQL Connections =====
export function useDatabaseConnections() {
  return useQuery({
    queryKey: ['database-connections'],
    queryFn: async (): Promise<DatabaseConnection[]> => {
      const { data, error } = await supabase
        .from('database_connections')
        .select('id, name, host, port, database_name, username, schema_name, ssl_mode, active, enabled, last_status, last_connected_at, last_error')
        .order('created_at');
      if (error) throw error;
      return (data || []) as DatabaseConnection[];
    },
  });
}

export function useDataSources() {
  return useDatabaseConnections();
}

export function useUpsertDatabaseConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connection: Record<string, unknown>) => {
      await requireAuthenticatedSession();
      const { id, ...rest } = connection;

      const payload = { ...rest } as Record<string, unknown>;
      if (payload.password_secret === '') {
        delete payload.password_secret;
      }

      if (id) {
        const { data, error } = await supabase.from('database_connections').update(payload as never).eq('id', id as string).select('id').single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase.from('database_connections').insert(payload as never).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['database-connections'] });
      toast.success('Database connection saved');
    },
    onError: (e: Error) => {
      if (e.message === 'SESSION_NOT_READY') {
        toast.error('Your session is not ready or has expired. Please sign in again.');
        return;
      }
      if (isPermissionError(e.message)) {
        toast.error('You do not have permission to save this database connection.');
        return;
      }
      toast.error('Save failed. Please try again.');
    },
  });
}

export function useToggleDatabaseConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from('database_connections').update({ enabled }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['database-connections'] });
      toast.success('Connection updated');
    },
  });
}

export function useToggleSource() {
  return useToggleDatabaseConnection();
}

export function useTestPostgresConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string): Promise<PostgresFunctionResponse> => {
      const { data, error } = await supabase.functions.invoke('postgres-ops', {
        body: { action: 'test_connection', connectionId },
      });
      if (error) throw error;
      return data as PostgresFunctionResponse;
    },
    onSuccess: (data) => {
      if (data.success) toast.success(data.message || 'Connection successful');
      else toast.error(data.error || 'Connection test failed');
      qc.invalidateQueries({ queryKey: ['database-connections'] });
    },
    onError: (e: Error) => toast.error(`Connection test failed: ${e.message}`),
  });
}

export function useInspectDatabaseConnection() {
  return useMutation({
    mutationFn: async (connectionId: string): Promise<PostgresFunctionResponse> => {
      const { data, error } = await supabase.functions.invoke('postgres-ops', {
        body: { action: 'inspect_tables', connectionId },
      });
      if (error) throw error;
      return data as PostgresFunctionResponse;
    },
    onError: (e: Error) => toast.error(`Inspection failed: ${e.message}`),
  });
}

export function usePreviewDatabaseTable() {
  return useMutation({
    mutationFn: async (params: { connectionId: string; schema: string; table: string; limit?: number }): Promise<PostgresFunctionResponse> => {
      const { data, error } = await supabase.functions.invoke('postgres-ops', {
        body: { action: 'preview_table', ...params },
      });
      if (error) throw error;
      return data as PostgresFunctionResponse;
    },
    onError: (e: Error) => toast.error(`Preview failed: ${e.message}`),
  });
}

export function useDatasetMappings(connectionId?: string) {
  return useQuery({
    queryKey: ['dataset-mappings', connectionId],
    queryFn: async (): Promise<DatasetMapping[]> => {
      let q = supabase.from('dataset_mappings').select('*').order('dataset_key');
      if (connectionId) q = q.eq('connection_id', connectionId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as DatasetMapping[];
    },
  });
}

export function useUpsertDatasetMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mapping: Record<string, unknown>) => {
      const { id, ...rest } = mapping;
      const { data, error } = id
        ? await supabase.from('dataset_mappings').update(rest as never).eq('id', id as string).select('id').single()
        : await supabase.from('dataset_mappings').insert(rest as never).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dataset-mappings'] });
      toast.success('Dataset mapping saved');
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });
}

export function useDeleteDatasetMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dataset_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dataset-mappings'] });
      toast.success('Dataset mapping removed');
    },
  });
}

// ===== Parser Profiles =====
export function useParserProfiles() {
  return useQuery({
    queryKey: ['parser-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('parser_profiles').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertParserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Record<string, unknown>) => {
      const { id, ...rest } = profile;
      const { data, error } = id
        ? await supabase.from('parser_profiles').update(rest as any).eq('id', id as string).select().single()
        : await supabase.from('parser_profiles').insert(rest as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parser-profiles'] });
      toast.success('Parser profile saved');
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });
}

// ===== Mapping Rules =====
export function useMappingRules(profileId?: string) {
  return useQuery({
    queryKey: ['mapping-rules', profileId],
    queryFn: async () => {
      let query = supabase.from('mapping_rules').select('*, parser_profiles(name)').order('sort_order');
      if (profileId) query = query.eq('profile_id', profileId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertMappingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Record<string, unknown>) => {
      const { id, ...rest } = rule;
      const { data, error } = id
        ? await supabase.from('mapping_rules').update(rest as any).eq('id', id as string).select().single()
        : await supabase.from('mapping_rules').insert(rest as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-rules'] });
      toast.success('Mapping rule saved');
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });
}

export function useDeleteMappingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mapping_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-rules'] });
      toast.success('Rule deleted');
    },
  });
}

// ===== Import Batches =====
export function useImportBatches() {
  return useQuery({
    queryKey: ['import-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useImportErrors(batchId?: string) {
  return useQuery({
    queryKey: ['import-errors', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_errors')
        .select('*')
        .eq('batch_id', batchId!)
        .order('row_number');
      if (error) throw error;
      return data;
    },
  });
}

export function useRawRows(batchId?: string) {
  return useQuery({
    queryKey: ['raw-rows', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_rows')
        .select('*')
        .eq('batch_id', batchId!)
        .order('row_number')
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useNormalizedRecords(batchId?: string) {
  return useQuery({
    queryKey: ['normalized-records', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('normalized_records')
        .select('*')
        .eq('batch_id', batchId!)
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

// ===== Parse / Import Pipeline =====
export function useParseFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { fileContent: string; profileId: string; sourceId?: string; dryRun?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('parse-file', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.dryRun) {
        toast.success(`Dry run: ${data.totalRows} rows parsed, ${data.errorCount} errors`);
      } else {
        toast.success(`Import complete: ${data.importedRows} rows imported`);
        qc.invalidateQueries({ queryKey: ['import-batches'] });
      }
    },
    onError: (e) => toast.error(`Parse failed: ${e.message}`),
  });
}

export function useRunImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { profileId: string; fileContent: string; fileName?: string }) => {
      const { data, error } = await supabase.functions.invoke('run-import', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Pipeline complete: ${data.importedRows || 0} rows imported`);
        qc.invalidateQueries({ queryKey: ['import-batches'] });
              } else {
        toast.error(`Import failed: ${data.error}`);
      }
    },
    onError: (e) => toast.error(`Pipeline failed: ${e.message}`),
  });
}

// ===== Audit Log =====
export function useAuditLog() {
  return useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}
