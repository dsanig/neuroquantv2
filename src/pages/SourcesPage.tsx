import { useMemo, useState } from "react";
import { useDataSources, useUpsertDataSource, useToggleSource, useTestFtpConnection, useFtpFetch, useTestPgpDecryption, useFtpBrowse, type FtpBrowserFile } from "@/hooks/use-pipeline";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, TestTube, Power, PowerOff, Loader2, RefreshCw, FolderSearch } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type SortField = "name" | "size" | "modifiedAt";

function formatBytes(size: number | null) {
  if (size === null || Number.isNaN(size)) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function maskHost(host: string) {
  if (!host) return "-";
  if (host.length <= 4) return "****";
  return `${host.slice(0, 2)}***${host.slice(-2)}`;
}

export default function SourcesPage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const [ftpDialogOpen, setFtpDialogOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [extensionFilter, setExtensionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "last7">("all");
  const [sortField, setSortField] = useState<SortField>("modifiedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [connectionState, setConnectionState] = useState<"idle" | "connected" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState<string>("No FTP test run yet.");
  const [files, setFiles] = useState<FtpBrowserFile[]>([]);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [debugJson, setDebugJson] = useState<string>("");

  const { data: sources, isLoading, refetch } = useDataSources();
  const { isAuthLoading, isAuthenticated } = useAuth();
  const upsert = useUpsertDataSource();
  const toggle = useToggleSource();
  const testFtp = useTestFtpConnection();
  const fetchFtp = useFtpFetch();
  const testPgp = useTestPgpDecryption();
  const ftpBrowse = useFtpBrowse();

  const ftpSources = useMemo(() => (sources || []).filter((s) => s.protocol === "FTP"), [sources]);

  const selectedSource = useMemo(
    () => ftpSources.find((s) => s.id === selectedSourceId) || null,
    [ftpSources, selectedSourceId],
  );

  const filteredFiles = useMemo(() => {
    const now = new Date();

    const rows = files.filter((f) => {
      const searchOk = !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase());
      const extOk = extensionFilter === "all" || f.extension.toLowerCase() === extensionFilter.toLowerCase();

      let dateOk = true;
      if (dateFilter !== "all" && f.modifiedAt) {
        const mod = new Date(f.modifiedAt);
        if (dateFilter === "today") {
          dateOk = mod.toDateString() === now.toDateString();
        } else if (dateFilter === "last7") {
          const diff = now.getTime() - mod.getTime();
          dateOk = diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
        }
      }

      return searchOk && extOk && dateOk;
    });

    rows.sort((a, b) => {
      let value = 0;
      if (sortField === "name") {
        value = a.name.localeCompare(b.name);
      } else if (sortField === "size") {
        value = (a.size ?? -1) - (b.size ?? -1);
      } else {
        value = new Date(a.modifiedAt ?? 0).getTime() - new Date(b.modifiedAt ?? 0).getTime();
      }
      return sortDirection === "asc" ? value : value * -1;
    });

    return rows;
  }, [files, searchTerm, extensionFilter, dateFilter, sortField, sortDirection]);

  const availableExtensions = useMemo(
    () => Array.from(new Set(files.map((f) => f.extension).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [files],
  );

  const runFtpTest = (testOnly: boolean) => {
    if (!selectedSourceId) {
      setConnectionState("error");
      setConnectionMessage("Please select an FTP source first.");
      return;
    }

    ftpBrowse.mutate(
      { sourceId: selectedSourceId, testOnly },
      {
        onSuccess: (res) => {
          setDebugJson(JSON.stringify(res, null, 2));
          if (!res.success) {
            setConnectionState("error");
            setConnectionMessage(res.userMessage || res.error || "FTP request failed.");
            if (!testOnly) {
              setFiles([]);
              setLastRefreshAt(new Date().toISOString());
            }
            return;
          }

          setConnectionState("connected");
          setConnectionMessage(
            testOnly
              ? `Connection successful (${res.latencyMs ?? 0} ms).`
              : `Connection successful. Retrieved ${res.fileCount ?? 0} files.`,
          );

          if (!testOnly) {
            setFiles(res.files || []);
            setLastRefreshAt(res.listedAt || new Date().toISOString());
          }
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          setConnectionState("error");
          setConnectionMessage("Unable to run FTP test. Check server logs for details.");
          setDebugJson(JSON.stringify({ error: message }, null, 2));
        },
      },
    );
  };

  const startEdit = (id: string) => {
    const src = sources?.find((s) => s.id === id);
    if (src) {
      setForm({ ...src });
      setEditing(id);
      setCreating(false);
    }
  };

  const startCreate = () => {
    setForm({
      name: "", type: "IBKR Activity Statement", protocol: "FTP",
      host: "", port: 21, username: "", password_ref: "",
      remote_path: "/", filename_pattern: "*", polling_schedule: "0 6 * * *",
      active: true, encrypted: false, encryption_type: "PGP",
      pgp_key_ref: "", pgp_passphrase_ref: "", pgp_armored: true,
    });
    setEditing(null);
    setCreating(true);
  };

  const handleSave = () => {
    if (isAuthLoading) {
      toast.error("Your session is not ready or has expired. Please sign in again.");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Your session is not ready or has expired. Please sign in again.");
      return;
    }

    const payload = { ...form };
    if (editing) payload.id = editing;
    upsert.mutate(payload, {
      onSuccess: () => {
        setEditing(null);
        setCreating(false);
      },
    });
  };

  const handleTestConnection = () => {
    testFtp.mutate({
      host: form.host as string,
      port: form.port as number,
      username: form.username as string,
      password: form.password_ref as string,
      protocol: form.protocol as string,
    });
  };

  const handleTestDecryption = () => {
    testPgp.mutate({
      pgpPrivateKey: form.pgp_key_ref as string,
      passphrase: form.pgp_passphrase_ref as string,
      testOnly: true,
    });
  };

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Sources</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setFtpDialogOpen(true);
              if (!selectedSourceId && ftpSources[0]?.id) {
                setSelectedSourceId(ftpSources[0].id);
              }
            }}
          >
            <FolderSearch className="h-3.5 w-3.5 mr-1.5" />Open FTP Test Window
          </Button>
          <Button size="sm" className="text-xs" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Source
          </Button>
        </div>
      </div>

      {(!sources || sources.length === 0) && !creating ? (
        <div className="metric-card text-center py-12">
          <p className="text-muted-foreground text-sm mb-3">No data sources configured yet.</p>
          <Button size="sm" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Your First Source
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {(sources || []).map((s) => (
            <div key={s.id} className="metric-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-foreground font-semibold text-sm">{s.name}</span>
                <StatusBadge status={s.active ? (s.last_status === "connected" ? "completed" : s.last_status === "error" ? "failed" : "pending") : "inactive"} />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Protocol</span><span className="font-mono">{s.protocol}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Host</span><span className="font-mono">{s.host}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Port</span><span className="font-mono">{s.port}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Encrypted</span><span className="font-mono">{s.encrypted ? "PGP" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-mono">{s.polling_schedule}</span></div>
                {s.last_connected_at && <div className="flex justify-between"><span className="text-muted-foreground">Last Connected</span><span className="font-mono">{new Date(s.last_connected_at).toLocaleString()}</span></div>}
                {s.last_error && <div className="text-destructive text-xs mt-1">{s.last_error}</div>}
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => startEdit(s.id)}>Configure</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => fetchFtp.mutate(s.id)} disabled={fetchFtp.isPending}>
                  {fetchFtp.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => toggle.mutate({ id: s.id, active: !s.active })}>
                  {s.active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <div className="metric-card mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">{editing ? "Edit Source" : "New Source"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="config-label">Source Name</label><Input value={(form.name as string) || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Type</label><Input value={(form.type as string) || ""} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-secondary border-border" /></div>
            <div>
              <label className="config-label">Protocol</label>
              <select value={(form.protocol as string) || "FTP"} onChange={(e) => setForm({ ...form, protocol: e.target.value, port: e.target.value === "SFTP" ? 22 : 21 })} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                <option value="FTP">FTP</option>
                <option value="SFTP">SFTP</option>
              </select>
            </div>
            <div><label className="config-label">Host</label><Input value={(form.host as string) || ""} onChange={(e) => setForm({ ...form, host: e.target.value })} className="bg-secondary border-border" placeholder="ftp.example.com" /></div>
            <div><label className="config-label">Port</label><Input type="number" value={(form.port as number) || 21} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Username</label><Input value={(form.username as string) || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Password / Secret Ref</label><Input type="password" value={(form.password_ref as string) || ""} onChange={(e) => setForm({ ...form, password_ref: e.target.value })} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Remote Path</label><Input value={(form.remote_path as string) || "/"} onChange={(e) => setForm({ ...form, remote_path: e.target.value })} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Filename Pattern</label><Input value={(form.filename_pattern as string) || "*"} onChange={(e) => setForm({ ...form, filename_pattern: e.target.value })} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Polling Schedule (cron)</label><Input value={(form.polling_schedule as string) || "0 6 * * *"} onChange={(e) => setForm({ ...form, polling_schedule: e.target.value })} className="bg-secondary border-border" /></div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={handleTestConnection} disabled={testFtp.isPending}>
                {testFtp.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <TestTube className="h-3 w-3 mr-1.5" />}
                Test Connection
              </Button>
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3 border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">PGP Decryption</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="config-label">Encrypted</label>
                <select value={form.encrypted ? "true" : "false"} onChange={(e) => setForm({ ...form, encrypted: e.target.value === "true" })} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div><label className="config-label">Encryption Type</label><Input value={(form.encryption_type as string) || "PGP"} onChange={(e) => setForm({ ...form, encryption_type: e.target.value })} className="bg-secondary border-border" /></div>
              <div><label className="config-label">PGP Private Key Ref</label><Input value={(form.pgp_key_ref as string) || ""} onChange={(e) => setForm({ ...form, pgp_key_ref: e.target.value })} className="bg-secondary border-border" placeholder="vault://key-name or paste key" /></div>
              <div>
                <label className="config-label">Armored</label>
                <select value={form.pgp_armored ? "true" : "false"} onChange={(e) => setForm({ ...form, pgp_armored: e.target.value === "true" })} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                  <option value="true">ASCII-Armored</option>
                  <option value="false">Binary</option>
                </select>
              </div>
              <div><label className="config-label">Passphrase Secret Ref</label><Input type="password" value={(form.pgp_passphrase_ref as string) || ""} onChange={(e) => setForm({ ...form, pgp_passphrase_ref: e.target.value })} className="bg-secondary border-border" /></div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" className="text-xs" onClick={handleTestDecryption} disabled={testPgp.isPending}>
                  {testPgp.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <TestTube className="h-3 w-3 mr-1.5" />}
                  Test Decryption
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => { setEditing(null); setCreating(false); }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={upsert.isPending || isAuthLoading || !isAuthenticated}>
              {upsert.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
              Save Configuration
            </Button>
          </div>
        </div>
      )}

      <Dialog open={ftpDialogOpen} onOpenChange={setFtpDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>FTP Test Window</DialogTitle>
            <DialogDescription>
              Read-only FTP inspection tool. No files are imported, moved, deleted, or processed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="config-label">FTP Source</label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2"
              >
                <option value="">Select FTP source...</option>
                {ftpSources.map((src) => (
                  <option key={src.id} value={src.id}>{src.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="config-label">Host</label>
              <div className="h-10 px-3 border border-border rounded-md bg-secondary text-sm flex items-center font-mono">
                {maskHost(selectedSource?.host || "")}
              </div>
            </div>
            <div>
              <label className="config-label">Path</label>
              <div className="h-10 px-3 border border-border rounded-md bg-secondary text-sm flex items-center font-mono">
                {selectedSource?.remote_path || "-"}
              </div>
            </div>
            <div>
              <label className="config-label">Protocol</label>
              <div className="h-10 px-3 border border-border rounded-md bg-secondary text-sm flex items-center font-mono">
                {selectedSource?.protocol || "-"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => runFtpTest(true)} disabled={ftpBrowse.isPending || !selectedSourceId}>
              {ftpBrowse.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <TestTube className="h-3.5 w-3.5 mr-1.5" />}
              Test Connection
            </Button>
            <Button size="sm" onClick={() => runFtpTest(false)} disabled={ftpBrowse.isPending || !selectedSourceId}>
              {ftpBrowse.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Refresh File List
            </Button>
            <Badge variant={connectionState === "connected" ? "default" : connectionState === "error" ? "destructive" : "secondary"}>
              {connectionState === "connected" ? "Connected" : connectionState === "error" ? "Error" : "Idle"}
            </Badge>
            <span className="text-sm text-muted-foreground">{connectionMessage}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input placeholder="Search file name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <select value={extensionFilter} onChange={(e) => setExtensionFilter(e.target.value)} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
              <option value="all">All extensions</option>
              {availableExtensions.map((ext) => <option key={ext} value={ext}>{ext}</option>)}
            </select>
            <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
              <option value="modifiedAt">Sort: Modified</option>
              <option value="name">Sort: Name</option>
              <option value="size">Sort: Size</option>
            </select>
            <select value={sortDirection} onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as "all" | "today" | "last7")} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="last7">Last 7 days</option>
            </select>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total files: {filteredFiles.length}</span>
            <span>Last refresh: {lastRefreshAt ? new Date(lastRefreshAt).toLocaleString() : "-"}</span>
          </div>

          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Extension</th>
                  <th className="text-left px-3 py-2">Size</th>
                  <th className="text-left px-3 py-2">Modified</th>
                  <th className="text-left px-3 py-2">Directory / Path</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      {connectionState === "connected" ? "No files found in this folder." : "Run a test/list command to view available files."}
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => (
                    <tr key={`${file.fullPath}-${file.name}`} className="border-b border-border/60">
                      <td className="px-3 py-2 font-mono">{file.name}</td>
                      <td className="px-3 py-2">{file.extension || "-"}</td>
                      <td className="px-3 py-2">{formatBytes(file.size)}</td>
                      <td className="px-3 py-2">{file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : "-"}</td>
                      <td className="px-3 py-2 font-mono">{file.fullPath}</td>
                      <td className="px-3 py-2">{file.isDirectory ? "directory" : "file"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <details>
            <summary className="text-xs text-muted-foreground cursor-pointer">Raw JSON debug view</summary>
            <pre className="mt-2 p-3 rounded-md bg-secondary text-xs overflow-x-auto border border-border">{debugJson || "No debug payload yet."}</pre>
          </details>
        </DialogContent>
      </Dialog>
    </div>
  );
}
