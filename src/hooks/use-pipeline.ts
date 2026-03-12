import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractFilenameDate } from '@/lib/filename-date';

function isPermissionError(message?: string) {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('row-level security') || normalized.includes('permission denied') || normalized.includes('not allowed');
}

async function requireAuthenticatedSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error('Failed to get Supabase session before write operation.', sessionError);
    throw new Error('SESSION_NOT_READY');
  }

  if (!sessionData.session) {
    throw new Error('SESSION_NOT_READY');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error('Failed to get Supabase user before write operation.', userError);
    throw new Error('SESSION_NOT_READY');
  }

  if (!userData.user) {
    throw new Error('SESSION_NOT_READY');
  }

  return userData.user;
}

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
      await requireAuthenticatedSession();

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
    onError: (e: Error) => {
      if (e.message === 'SESSION_NOT_READY') {
        toast.error('Your session is not ready or has expired. Please sign in again.');
        return;
      }

      if (isPermissionError(e.message)) {
        toast.error('You do not have permission to save this source configuration.');
        return;
      }

      console.error('Unexpected source save error.', e);
      toast.error('Save failed. Please try again.');
    },
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
    mutationFn: async (params: string | { sourceId: string; testOnly?: boolean }) => {
      const body = typeof params === 'string' ? { sourceId: params } : params;
      const { data, error } = await supabase.functions.invoke('ftp-fetch', { body });
      if (error) {
        const payload = (error.context && typeof error.context === 'object'
          ? error.context
          : null) as { error?: string; errorCode?: string; userMessage?: string; status?: number } | null;
        throw new FtpBrowseInvokeError({
          status: payload?.status || 500,
          message: payload?.error || error.message || 'FTP backend request failed.',
          errorCode: payload?.errorCode,
          userMessage: payload?.userMessage,
          details: payload ?? error,
        });
      }
      return normalizeFtpBrowseResponse(data);
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(`Fetch failed: ${data.error}`);
        return;
      }

      if (!data.testOnly) {
        toast.success(`Found ${data.fileCount} files`);
      }

      qc.invalidateQueries({ queryKey: ['data-sources'] });
    },
    onError: (e) => toast.error(`Fetch failed: ${e.message}`),
  });
}

export type FtpBrowserFile = {
  name: string;
  extension: string | null;
  sizeBytes: number | null;
  modifiedAt: string | null;
  extractedFilenameDate: string | null;
  path: string | null;
  type: string | null;
  status: string | null;
  rights: string | null;
  owner: string | null;
  raw?: unknown;

  // Backward-compatible fields used in existing UI code paths.
  fullPath: string;
  directory?: string;
  size: number | null;
  isDirectory: boolean;
  permissions: string | null;
};

export type FtpBrowseResponse = {
  success: boolean;
  connectionStatus: 'connected' | 'error';
  errorCode?: string;
  mode?: 'test' | 'list';
  files?: FtpBrowserFile[];
  fileCount?: number;
  rawFileCount?: number;
  normalizedFileCount?: number;
  displayedFileCount?: number;
  droppedEntriesCount?: number;
  droppedEntriesPreview?: Array<{ reason: string; raw: string }>;
  configuredPath?: string;
  pathUsed?: string;
  sourceId?: string;
  emptyDirectory?: boolean;
  listedAt?: string;
  testedAt?: string;
  latencyMs?: number;
  testOnly?: boolean;
  error?: string;
  userMessage?: string;
};

function extractExtension(name: string): string | null {
  const trimmed = name.trim();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === trimmed.length - 1) return null;
  return trimmed.slice(lastDot + 1).toLowerCase();
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toNullableDate(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeFtpFile(input: unknown): FtpBrowserFile | null {
  if (typeof input === 'string') {
    const name = input.trim();
    if (!name) return null;
    const extension = extractExtension(name);
    return {
      name,
      extension,
      sizeBytes: null,
      modifiedAt: null,
      extractedFilenameDate: extractFilenameDate(name)?.isoDate ?? null,
      path: null,
      type: 'file',
      status: 'file',
      rights: null,
      owner: null,
      raw: input,
      fullPath: name,
      directory: '',
      size: null,
      isDirectory: false,
      permissions: null,
    };
  }

  if (!input || typeof input !== 'object') return null;

  const row = input as Record<string, unknown>;
  const path = typeof row.path === 'string'
    ? row.path
    : typeof row.fullPath === 'string'
      ? row.fullPath
      : typeof row.filePath === 'string'
        ? row.filePath
        : null;

  const nameFromPath = path?.split('/').filter(Boolean).pop() ?? null;
  const rawLine = typeof row.raw === 'string' ? row.raw.trim() : null;
  const rawTail = rawLine ? rawLine.split(/\s+/).pop() ?? null : null;
  const name = (typeof row.name === 'string' && row.name.trim())
    || (typeof row.filename === 'string' && row.filename.trim())
    || nameFromPath
    || rawTail
    || null;
  if (!name) return null;

  const extension = typeof row.extension === 'string' && row.extension.trim()
    ? row.extension.toLowerCase()
    : extractExtension(name);

  const sizeBytes = toNullableNumber(row.sizeBytes ?? row.size ?? row.bytes);
  const modifiedAt = toNullableDate(row.modifiedAt ?? row.modified ?? row.mtime ?? row.date);
  const type = typeof row.type === 'string' ? row.type : (row.isDirectory ? 'directory' : 'file');
  const status = typeof row.status === 'string' ? row.status : (type === 'directory' ? 'directory' : 'file');
  const rights = typeof row.rights === 'string'
    ? row.rights
    : typeof row.permissions === 'string'
      ? row.permissions
      : null;
  const directory = typeof row.directory === 'string'
    ? row.directory
    : (path?.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

  return {
    name,
    extension,
    sizeBytes,
    modifiedAt,
    extractedFilenameDate: extractFilenameDate(name)?.isoDate ?? null,
    path,
    type,
    status,
    rights,
    owner: typeof row.owner === 'string' ? row.owner : null,
    raw: row.raw ?? input,
    fullPath: path ?? name,
    directory,
    size: sizeBytes,
    isDirectory: type === 'directory' || Boolean(row.isDirectory),
    permissions: rights,
  };
}

function normalizeFtpBrowseResponse(payload: unknown): FtpBrowseResponse {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const sourceFiles = Array.isArray(raw.files) ? raw.files : [];
  const normalized = sourceFiles.map((item) => normalizeFtpFile(item));
  const files = normalized.filter((item): item is FtpBrowserFile => Boolean(item));
  const droppedFromNormalization = normalized.length - files.length;
  const backendDroppedCount = typeof raw.droppedEntriesCount === 'number' ? raw.droppedEntriesCount : 0;

  return {
    ...(raw as FtpBrowseResponse),
    files,
    fileCount: typeof raw.fileCount === 'number' ? raw.fileCount : files.length,
    normalizedFileCount: typeof raw.normalizedFileCount === 'number' ? raw.normalizedFileCount : files.length,
    rawFileCount: typeof raw.rawFileCount === 'number' ? raw.rawFileCount : sourceFiles.length,
    pathUsed: typeof raw.pathUsed === 'string' ? raw.pathUsed : (typeof raw.configuredPath === 'string' ? raw.configuredPath : undefined),
    displayedFileCount: typeof raw.displayedFileCount === 'number' ? raw.displayedFileCount : files.length,
    droppedEntriesCount: backendDroppedCount + droppedFromNormalization,
  };
}

export class FtpBrowseInvokeError extends Error {
  status: number;
  errorCode?: string;
  userMessage?: string;
  details?: unknown;

  constructor(params: { message: string; status: number; errorCode?: string; userMessage?: string; details?: unknown }) {
    super(params.message);
    this.name = 'FtpBrowseInvokeError';
    this.status = params.status;
    this.errorCode = params.errorCode;
    this.userMessage = params.userMessage;
    this.details = params.details;
  }
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
