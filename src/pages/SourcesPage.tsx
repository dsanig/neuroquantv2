import { useMemo, useState } from "react";
import {
  useDatabaseConnections,
  useUpsertDatabaseConnection,
  useToggleDatabaseConnection,
  useTestPostgresConnection,
  useInspectDatabaseConnection,
  usePreviewDatabaseTable,
  useDatasetMappings,
  useUpsertDatasetMapping,
  useDeleteDatasetMapping,
} from "@/hooks/use-pipeline";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, RefreshCw, Database, Power, PowerOff, Search } from "lucide-react";

const DATASET_KEYS = [
  "positions",
  "trades",
  "greeks",
  "performance",
  "cashflows",
  "risk_snapshots",
  "import_runs",
] as const;

export default function SourcesPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [inspectResult, setInspectResult] = useState<{ schemas: string[]; tables: Array<{ schema: string; table: string; rowCount?: number | null }> }>({ schemas: [], tables: [] });
  const [preview, setPreview] = useState<{ columns: string[]; rows: Array<Record<string, unknown>> }>({ columns: [], rows: [] });
  const [mappingForm, setMappingForm] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { status: 'testing' | 'success' | 'error'; tableCount?: number; message?: string }>>({});

  const { data: connections, isLoading, refetch } = useDatabaseConnections();
  const upsert = useUpsertDatabaseConnection();
  const toggle = useToggleDatabaseConnection();
  const testConnection = useTestPostgresConnection();
  const inspectConnection = useInspectDatabaseConnection();
  const previewTable = usePreviewDatabaseTable();
  const { data: mappings } = useDatasetMappings(selectedConnectionId || undefined);
  const upsertMapping = useUpsertDatasetMapping();
  const deleteMapping = useDeleteDatasetMapping();

  const selectedConnection = useMemo(
    () => (connections || []).find((c) => c.id === selectedConnectionId) || null,
    [connections, selectedConnectionId],
  );

  const runTestAndInspect = (connectionId: string) => {
    setTestResults((prev) => ({ ...prev, [connectionId]: { status: 'testing' } }));
    testConnection.mutate(connectionId, {
      onSuccess: (data) => {
        if (!data.success) {
          setTestResults((prev) => ({ ...prev, [connectionId]: { status: 'error', message: data.error || 'Connection failed' } }));
          return;
        }
        inspectConnection.mutate(connectionId, {
          onSuccess: (inspectData) => {
            const conn = (connections || []).find((c) => c.id === connectionId);
            const schemaFilter = conn?.schema_name || 'public';
            const tablesInSchema = (inspectData.tables || []).filter((t) => t.schema === schemaFilter);
            setTestResults((prev) => ({
              ...prev,
              [connectionId]: { status: 'success', tableCount: tablesInSchema.length, message: data.message },
            }));
          },
          onError: (err) => {
            setTestResults((prev) => ({
              ...prev,
              [connectionId]: { status: 'success', message: `${data.message} (inspect failed: ${err.message})` },
            }));
          },
        });
      },
      onError: (err) => {
        setTestResults((prev) => ({ ...prev, [connectionId]: { status: 'error', message: err.message } }));
      },
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm({
      name: "",
      host: "127.0.0.1",
      port: 5432,
      database_name: "",
      username: "",
      password_secret: "",
      schema_name: "public",
      ssl_mode: "disable",
      active: true,
      enabled: true,
    });
  };

  const startEdit = (id: string) => {
    const row = (connections || []).find((c) => c.id === id);
    if (!row) return;
    setCreating(false);
    setEditingId(id);
    setForm({ ...row, password_secret: "" });
  };

  const saveConnection = () => {
    const payload = { ...form };
    if (!(payload.password_secret as string)?.trim()) {
      delete payload.password_secret;
    }
    if (editingId) payload.id = editingId;
    upsert.mutate(payload, {
      onSuccess: () => {
        setCreating(false);
        setEditingId(null);
        setForm({});
      },
    });
  };

  const runInspect = () => {
    if (!selectedConnectionId) return;
    inspectConnection.mutate(selectedConnectionId, {
      onSuccess: (data) => {
        if (!data.success) return;
        setInspectResult({ schemas: data.schemas || [], tables: data.tables || [] });
      },
    });
  };

  const previewMappedTable = (schema: string, table: string) => {
    if (!selectedConnectionId) return;
    previewTable.mutate({ connectionId: selectedConnectionId, schema, table, limit: 25 }, {
      onSuccess: (data) => {
        if (!data.success) return;
        const columns = (data.columns || []).map((c) => c.name);
        setPreview({ columns, rows: data.rows || [] });
      },
    });
  };

  if (isLoading) {
    return <div className="page-container flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="page-container space-y-5">
      <div className="section-header">
        <h1 className="section-title">Data Connections</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</Button>
          <Button size="sm" className="text-xs" onClick={startCreate}><Plus className="h-3.5 w-3.5 mr-1.5" />Add PostgreSQL Connection</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(connections || []).map((c) => (
          <div key={c.id} className="metric-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">{c.name}</div>
              <StatusBadge status={c.enabled ? (c.last_status === "connected" ? "completed" : c.last_status === "error" ? "failed" : "pending") : "inactive"} />
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Host</span><span className="font-mono">{c.host}:{c.port}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Database</span><span className="font-mono">{c.database_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Schema</span><span className="font-mono">{c.schema_name || "public"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SSL</span><span className="font-mono">{c.ssl_mode}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => { setSelectedConnectionId(c.id); startEdit(c.id); }}>Configure</Button>
              <Button variant="outline" size="sm" onClick={() => testConnection.mutate(c.id)}>{testConnection.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}</Button>
              <Button variant="outline" size="sm" onClick={() => toggle.mutate({ id: c.id, enabled: !c.enabled })}>{c.enabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}</Button>
            </div>
          </div>
        ))}
      </div>

      {(creating || editingId) && (
        <div className="config-panel space-y-3">
          <h2 className="text-sm font-semibold">{editingId ? "Edit PostgreSQL Connection" : "New PostgreSQL Connection"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="config-label">Connection Name</label><Input value={(form.name as string) || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="config-label">Host</label><Input value={(form.host as string) || ""} onChange={(e) => setForm({ ...form, host: e.target.value })} /></div>
            <div><label className="config-label">Port</label><Input type="number" value={(form.port as number) || 5432} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} /></div>
            <div><label className="config-label">Database Name</label><Input value={(form.database_name as string) || ""} onChange={(e) => setForm({ ...form, database_name: e.target.value })} /></div>
            <div><label className="config-label">Username</label><Input value={(form.username as string) || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div><label className="config-label">Password</label><Input type="password" placeholder={editingId ? "Leave blank to keep existing password" : ""} value={(form.password_secret as string) || ""} onChange={(e) => setForm({ ...form, password_secret: e.target.value })} /></div>
            <div><label className="config-label">Schema (optional)</label><Input value={(form.schema_name as string) || ""} onChange={(e) => setForm({ ...form, schema_name: e.target.value })} /></div>
            <div>
              <label className="config-label">SSL Mode</label>
              <select value={(form.ssl_mode as string) || "disable"} onChange={(e) => setForm({ ...form, ssl_mode: e.target.value })} className="w-full bg-secondary border border-border text-sm rounded-md px-3 py-2">
                <option value="disable">disable</option>
                <option value="require">require</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveConnection} disabled={upsert.isPending}>{upsert.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Database className="h-3 w-3 mr-1.5" />}Save Connection</Button>
            <Button variant="outline" size="sm" onClick={() => { setCreating(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="config-panel space-y-3">
        <h2 className="text-sm font-semibold">Database Inspection</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="config-label">Connection</label>
            <select value={selectedConnectionId} onChange={(e) => setSelectedConnectionId(e.target.value)} className="w-full bg-secondary border border-border text-sm rounded-md px-3 py-2">
              <option value="">Select connection...</option>
              {(connections || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Button size="sm" onClick={runInspect} disabled={!selectedConnectionId || inspectConnection.isPending}>{inspectConnection.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Search className="h-3 w-3 mr-1.5" />}Inspect Tables</Button>
        </div>

        {inspectResult.tables.length > 0 && (
          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 border-b border-border"><tr><th className="text-left px-3 py-2">Schema</th><th className="text-left px-3 py-2">Table</th><th className="text-left px-3 py-2">Row Count</th><th className="px-3 py-2">Action</th></tr></thead>
              <tbody>
                {inspectResult.tables.map((t) => (
                  <tr key={`${t.schema}.${t.table}`} className="border-b border-border/60"><td className="px-3 py-2 font-mono">{t.schema}</td><td className="px-3 py-2 font-mono">{t.table}</td><td className="px-3 py-2">{t.rowCount ?? "-"}</td><td className="px-3 py-2 text-right"><Button variant="outline" size="sm" onClick={() => previewMappedTable(t.schema, t.table)}>Preview</Button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedConnection && (
        <div className="config-panel space-y-3">
          <h2 className="text-sm font-semibold">Dataset Table Mapping</h2>
          <div className="space-y-2">
            {DATASET_KEYS.map((datasetKey) => {
              const existing = (mappings || []).find((m) => m.dataset_key === datasetKey);
              const tableValue = mappingForm[`${datasetKey}:table`] ?? existing?.table_name ?? "";
              const schemaValue = mappingForm[`${datasetKey}:schema`] ?? existing?.schema_name ?? (selectedConnection.schema_name || "public");
              return (
                <div key={datasetKey} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <div className="md:col-span-1"><label className="config-label capitalize">{datasetKey.replace("_", " ")}</label></div>
                  <div className="md:col-span-1"><Input placeholder="schema" value={schemaValue} onChange={(e) => setMappingForm({ ...mappingForm, [`${datasetKey}:schema`]: e.target.value })} /></div>
                  <div className="md:col-span-2"><Input placeholder="table_name" value={tableValue} onChange={(e) => setMappingForm({ ...mappingForm, [`${datasetKey}:table`]: e.target.value })} /></div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => upsertMapping.mutate({ id: existing?.id, connection_id: selectedConnection.id, dataset_key: datasetKey, schema_name: schemaValue, table_name: tableValue, active: true })}>Save</Button>
                    {existing && <Button variant="outline" size="sm" onClick={() => deleteMapping.mutate(existing.id)}>Remove</Button>}
                    {existing && <Button variant="outline" size="sm" onClick={() => previewMappedTable(existing.schema_name, existing.table_name)}>Preview</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {preview.columns.length > 0 && (
        <div className="config-panel space-y-2">
          <h2 className="text-sm font-semibold">Table Preview (first 25 rows)</h2>
          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 border-b border-border"><tr>{preview.columns.map((c) => <th key={c} className="text-left px-2 py-1 font-mono">{c}</th>)}</tr></thead>
              <tbody>
                {preview.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/50">{preview.columns.map((col) => <td key={col} className="px-2 py-1 font-mono">{String(row[col] ?? "")}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
