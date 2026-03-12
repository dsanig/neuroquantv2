import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ===== Data Sources =====
export function useDataSources() {
  return useQuery({
    queryKey: ['data-sources'],
    queryFn: async () => {
      const { data, error } = await supabase.from('data_sources').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertDataSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (source: Record<string, unknown>) => {
      const { id, ...rest } = source;
      const { data, error } = id
        ? await supabase.from('data_sources').update(rest as any).eq('id', id as string).select().single()
        : await supabase.from('data_sources').insert(rest as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['data-sources'] });
      toast.success('Source saved');
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });
}

export function useToggleSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('data_sources').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['data-sources'] });
      toast.success('Source updated');
    },
  });
}

export function useTestFtpConnection() {
  return useMutation({
    mutationFn: async (params: { host: string; port: number; username: string; password?: string; protocol: string }) => {
      const { data, error } = await supabase.functions.invoke('ftp-test', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Connected! Latency: ${data.latency}`, { description: data.banner });
      } else {
        toast.error(`Connection failed: ${data.error}`);
      }
    },
    onError: (e) => toast.error(`Test failed: ${e.message}`),
  });
}

export function useFtpFetch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: string) => {
      const { data, error } = await supabase.functions.invoke('ftp-fetch', { body: { sourceId } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Found ${data.fileCount} files`);
        qc.invalidateQueries({ queryKey: ['data-sources'] });
      } else {
        toast.error(`Fetch failed: ${data.error}`);
      }
    },
    onError: (e) => toast.error(`Fetch failed: ${e.message}`),
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
      const { data, error } = profile.id
        ? await supabase.from('parser_profiles').update(profile).eq('id', profile.id as string).select().single()
        : await supabase.from('parser_profiles').insert(profile).select().single();
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
      const { data, error } = rule.id
        ? await supabase.from('mapping_rules').update(rule).eq('id', rule.id as string).select().single()
        : await supabase.from('mapping_rules').insert(rule).select().single();
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
    mutationFn: async (params: { sourceId: string; fileContent: string; fileName: string }) => {
      const { data, error } = await supabase.functions.invoke('run-import', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Pipeline complete: ${data.importedRows || 0} rows imported`);
        qc.invalidateQueries({ queryKey: ['import-batches'] });
        qc.invalidateQueries({ queryKey: ['data-sources'] });
      } else {
        toast.error(`Import failed: ${data.error}`);
      }
    },
    onError: (e) => toast.error(`Pipeline failed: ${e.message}`),
  });
}

export function useTestPgpDecryption() {
  return useMutation({
    mutationFn: async (params: { encryptedData?: string; pgpPrivateKey: string; passphrase?: string; testOnly?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('pgp-decrypt', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.testResult) {
        toast.success(data.testResult.message);
      } else {
        toast.success('Decryption successful');
      }
    },
    onError: (e) => toast.error(`Decryption test failed: ${e.message}`),
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
