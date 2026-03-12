import { useMemo, useState } from "react";
import {
  useDataSources,
  useUpsertDataSource,
  useToggleSource,
  useTestFtpConnection,
  useFtpFetch,
  useTestPgpDecryption,
  FtpBrowseInvokeError,
  type FtpBrowserFile,
  type FtpBrowseResponse,
} from "@/hooks/use-pipeline";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, TestTube, Power, PowerOff, Loader2, RefreshCw, FolderSearch } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { toYYYYMMDDFromIsoDate } from "@/lib/filename-date";
import { formatPollingSchedule, parsePollingSchedule, serializePollingSchedule } from "@/lib/polling-schedule";

type SortField = "name" | "sizeBytes" | "filenameDate";
type DateFilterMode = "all" | "today" | "yesterday" | "customDate" | "customRange";

type ScheduleEditorState = {
  enabled: boolean;
  time: string;
  daysOfWeek: number[];
  timezone: string;
};

const WEEKDAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

function formatBytes(sizeBytes: number | null | undefined) {
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes < 0) return "-";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 ** 2) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  if (sizeBytes < 1024 ** 3) return `${(sizeBytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(sizeBytes / 1024 ** 3).toFixed(2)} GB`;
}

function maskHost(host: string) {
  if (!host) return "-";
  if (host.length <= 4) return "****";
  return `${host.slice(0, 2)}***${host.slice(-2)}`;
}

function toDateInputValue(offsetDays = 0): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return now.toISOString().slice(0, 10);
}

function compareNullableStrings(a: string | null | undefined, b: string | null | undefined): number {
  return (a || "").localeCompare(b || "");
}

function normalizeScheduleEditorState(raw: string | null | undefined): ScheduleEditorState {
  const schedule = parsePollingSchedule(raw);
  return {
    enabled: schedule.enabled,
    time: schedule.time,
    daysOfWeek: schedule.daysOfWeek,
    timezone: schedule.timezone,
  };
}

export default function SourcesPage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [scheduleEditor, setScheduleEditor] = useState<ScheduleEditorState>(normalizeScheduleEditorState("0 6 * * *"));

  const [ftpDialogOpen, setFtpDialogOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [customDate, setCustomDate] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [extensionFilter, setExtensionFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [connectionState, setConnectionState] = useState<"idle" | "connected" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState<string>("No FTP test run yet.");
  const [files, setFiles] = useState<FtpBrowserFile[]>([]);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [lastListResponse, setLastListResponse] = useState<FtpBrowseResponse | null>(null);
  const [debugJson, setDebugJson] = useState<string>("");

  const { data: sources, isLoading, refetch } = useDataSources();
  const { isAuthLoading, isAuthenticated } = useAuth();
  const upsert = useUpsertDataSource();
  const toggle = useToggleSource();
  const testFtp = useTestFtpConnection();
  const fetchFtp = useFtpFetch();
  const testPgp = useTestPgpDecryption();

  const ftpSources = useMemo(() => (sources || []).filter((s) => s.protocol === "FTP"), [sources]);

  const selectedSource = useMemo(
    () => ftpSources.find((s) => s.id === selectedSourceId) || null,
    [ftpSources, selectedSourceId],
  );

  const availableExtensions = useMemo(
    () => Array.from(new Set(files.map((f) => f.extension).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [files],
  );

  const filteredFiles = useMemo(() => {
    const today = toDateInputValue(0);
    const yesterday = toDateInputValue(-1);

    const rows = files.filter((f) => {
      const matchesName = !nameFilter || f.name.toLowerCase().includes(nameFilter.trim().toLowerCase());
      if (!matchesName) return false;

      const matchesExtension = extensionFilter === "all" || (f.extension ?? "").toLowerCase() === extensionFilter.toLowerCase();
      if (!matchesExtension) return false;

      const fileDate = f.extractedFilenameDate;
      if (dateFilterMode === "all") return true;
      if (!fileDate) return false;

      if (dateFilterMode === "today") return fileDate === today;
      if (dateFilterMode === "yesterday") return fileDate === yesterday;

      if (dateFilterMode === "customDate") {
        const target = customDate || today;
        return fileDate === target;
      }

      if (dateFilterMode === "customRange") {
        const start = customStartDate || "0000-01-01";
        const end = customEndDate || "9999-12-31";
        return fileDate >= start && fileDate <= end;
      }

      return true;
    });

    rows.sort((a, b) => {
      let value = 0;
      if (sortField === "name") {
        value = a.name.localeCompare(b.name);
      } else if (sortField === "sizeBytes") {
        value = (a.sizeBytes ?? -1) - (b.sizeBytes ?? -1);
      } else {
        value = compareNullableStrings(a.extractedFilenameDate, b.extractedFilenameDate);
      }
      return sortDirection === "asc" ? value : value * -1;
    });

    return rows;
  }, [files, nameFilter, extensionFilter, dateFilterMode, customDate, customStartDate, customEndDate, sortField, sortDirection]);

  const resetFilters = () => {
    setNameFilter("");
    setDateFilterMode("all");
    setCustomDate("");
    setCustomStartDate("");
    setCustomEndDate("");
    setExtensionFilter("all");
    setSortField("name");
    setSortDirection("asc");
  };

  const runFtpTest = (testOnly: boolean) => {
    if (!selectedSourceId) {
      setConnectionState("error");
      setConnectionMessage("Please select an FTP source first.");
      return;
    }

    fetchFtp.mutate(
      { sourceId: selectedSourceId, testOnly },
      {
        onSuccess: (res) => {
          setLastListResponse(res);
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
              : `Connection successful. Retrieved ${res.normalizedFileCount ?? res.fileCount ?? 0} files from ${res.pathUsed || res.configuredPath || "configured path"}.`,
          );

          if (!testOnly) {
            setFiles(res.files || []);
            setLastRefreshAt(res.listedAt || new Date().toISOString());
          }
        },
        onError: (err) => {
          const fallback = err instanceof Error ? err.message : String(err);
          setConnectionState("error");

          if (err instanceof FtpBrowseInvokeError) {
            if (err.errorCode === "FUNCTION_UNAVAILABLE") {
              setConnectionMessage("Cannot reach FTP backend service right now. Please retry shortly.");
            } else if (err.errorCode === "UNAUTHORIZED") {
              setConnectionMessage("Your session is not authorized for FTP testing. Please sign in again.");
            } else if (err.errorCode === "FTP_AUTH_FAILED") {
              setConnectionMessage("FTP login failed. Check username/password.");
            } else if (err.errorCode === "REMOTE_PATH_NOT_FOUND" || err.errorCode === "BAD_PATH" || err.errorCode === "INVALID_PATH") {
              setConnectionMessage("Remote FTP directory was not found or is inaccessible.");
            } else if (err.errorCode === "NETWORK_TIMEOUT" || err.errorCode === "TIMEOUT") {
              setConnectionMessage("FTP server timed out. Check host/port/firewall configuration.");
            } else if (err.errorCode === "NETWORK_UNREACHABLE" || err.errorCode === "BACKEND_UNAVAILABLE") {
              setConnectionMessage("FTP backend or server is unreachable from runtime.");
            } else if (err.errorCode === "UNSUPPORTED_PROTOCOL") {
              setConnectionMessage("Unsupported protocol. This read-only window currently supports FTP sources only.");
            } else if (err.errorCode === "FTP_PERMISSION_DENIED") {
              setConnectionMessage("Permission denied for remote FTP directory.");
            } else {
              setConnectionMessage(err.userMessage || fallback || "FTP request failed.");
            }

            setDebugJson(JSON.stringify({
              error: err.message,
              errorCode: err.errorCode,
              userMessage: err.userMessage,
              status: err.status,
              details: err.details,
            }, null, 2));
            setLastListResponse(null);
            return;
          }

          setConnectionMessage("Unable to run FTP test due to an unexpected client error.");
          setDebugJson(JSON.stringify({ error: fallback }, null, 2));
          setLastListResponse(null);
        },
      },
    );
  };

  const startEdit = (id: string) => {
    const src = sources?.find((s) => s.id === id);
    if (src) {
      setForm({ ...src });
      setScheduleEditor(normalizeScheduleEditorState(src.polling_schedule));
      setEditing(id);
      setCreating(false);
    }
  };

  const startCreate = () => {
    const defaultSchedule = normalizeScheduleEditorState("0 6 * * *");
    setForm({
      name: "", type: "IBKR Activity Statement", protocol: "FTP",
      host: "", port: 21, username: "", password_ref: "",
      remote_path: "/", filename_pattern: "*", polling_schedule: serializePollingSchedule(defaultSchedule),
      active: true, encrypted: false, encryption_type: "PGP",
      pgp_key_ref: "", pgp_passphrase_ref: "", pgp_armored: true,
    });
    setScheduleEditor(defaultSchedule);
    setEditing(null);
    setCreating(true);
  };

  const handleSave = () => {
    if (isAuthLoading || !isAuthenticated) {
      toast.error("Your session is not ready or has expired. Please sign in again.");
      return;
    }

    if (scheduleEditor.enabled) {
      if (!scheduleEditor.time) {
        toast.error("Polling time is required when polling is enabled.");
        return;
      }
      if (!scheduleEditor.daysOfWeek.length) {
        toast.error("Select at least one weekday when polling is enabled.");
        return;
      }
    }

    const payload = {
      ...form,
      polling_schedule: serializePollingSchedule(scheduleEditor),
    };

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
                <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-mono">{formatPollingSchedule(s.polling_schedule)}</span></div>
                {s.last_connected_at && <div className="flex justify-between"><span className="text-muted-foreground">Last Connected</span><span className="font-mono">{new Date(s.last_connected_at).toLocaleString()}</span></div>}
                {s.last_error && <div className="text-destructive text-xs mt-1">{s.last_error}</div>}
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => startEdit(s.id)}>Configure</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => fetchFtp.mutate({ sourceId: s.id })} disabled={fetchFtp.isPending}>
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

            <div className="md:col-span-2 lg:col-span-3 border rounded-md border-border p-3">
              <div className="text-sm font-semibold text-foreground mb-3">Polling schedule</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="config-label">Enable polling</label>
                  <select value={scheduleEditor.enabled ? "true" : "false"} onChange={(e) => setScheduleEditor((prev) => ({ ...prev, enabled: e.target.value === "true" }))} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="config-label">Daily time</label>
                  <Input type="time" value={scheduleEditor.time} onChange={(e) => setScheduleEditor((prev) => ({ ...prev, time: e.target.value }))} className="bg-secondary border-border" disabled={!scheduleEditor.enabled} />
                </div>
                <div>
                  <label className="config-label">Timezone</label>
                  <Input value={scheduleEditor.timezone} onChange={(e) => setScheduleEditor((prev) => ({ ...prev, timezone: e.target.value || "UTC" }))} className="bg-secondary border-border" placeholder="UTC" disabled={!scheduleEditor.enabled} />
                </div>
                <div className="text-xs text-muted-foreground flex items-end">{formatPollingSchedule(serializePollingSchedule(scheduleEditor))}</div>
              </div>
              <div className="mt-3">
                <label className="config-label">Weekdays</label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-1">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <label key={day.value} className="flex items-center gap-2 text-xs border border-border rounded-md px-2 py-1 bg-secondary">
                      <input
                        type="checkbox"
                        checked={scheduleEditor.daysOfWeek.includes(day.value)}
                        disabled={!scheduleEditor.enabled}
                        onChange={(e) => {
                          setScheduleEditor((prev) => {
                            const nextDays = e.target.checked
                              ? [...prev.daysOfWeek, day.value]
                              : prev.daysOfWeek.filter((d) => d !== day.value);
                            return { ...prev, daysOfWeek: Array.from(new Set(nextDays)).sort((a, b) => a - b) };
                          });
                        }}
                      />
                      <span>{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

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
            <Button size="sm" variant="outline" onClick={() => runFtpTest(true)} disabled={fetchFtp.isPending || !selectedSourceId}>
              {fetchFtp.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <TestTube className="h-3.5 w-3.5 mr-1.5" />}
              Test Connection
            </Button>
            <Button size="sm" onClick={() => runFtpTest(false)} disabled={fetchFtp.isPending || !selectedSourceId}>
              {fetchFtp.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Refresh File List
            </Button>
            <Badge variant={connectionState === "connected" ? "default" : connectionState === "error" ? "destructive" : "secondary"}>
              {connectionState === "connected" ? "Connected" : connectionState === "error" ? "Error" : "Idle"}
            </Badge>
            <span className="text-sm text-muted-foreground">{connectionMessage}</span>
          </div>

          <div className="border border-border rounded-md p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="config-label">Filename contains</label>
                <div className="flex gap-2">
                  <Input placeholder="GLOBAL_DAILY" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
                  <Button variant="outline" size="sm" onClick={() => setNameFilter("")}>Clear</Button>
                </div>
              </div>
              <div>
                <label className="config-label">Date filter</label>
                <select value={dateFilterMode} onChange={(e) => setDateFilterMode(e.target.value as DateFilterMode)} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                  <option value="all">All dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="customDate">Custom date</option>
                  <option value="customRange">Custom date range</option>
                </select>
              </div>
            </div>

            {dateFilterMode === "customDate" && (
              <div>
                <label className="config-label">Custom date</label>
                <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="max-w-xs" />
              </div>
            )}

            {dateFilterMode === "customRange" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="config-label">Start date</label>
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="config-label">End date</label>
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                <option value="name">Sort: Filename</option>
                <option value="filenameDate">Sort: Filename date</option>
                <option value="sizeBytes">Sort: Size</option>
              </select>
              <select value={sortDirection} onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
              <select value={extensionFilter} onChange={(e) => setExtensionFilter(e.target.value)} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                <option value="all">All extensions</option>
                {availableExtensions.map((ext) => <option key={ext} value={ext}>{ext}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={resetFilters}>Reset filters</Button>
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Displayed {filteredFiles.length} of {files.length} files
              {connectionState === "connected"
                ? ` / Raw: ${lastListResponse?.rawFileCount ?? files.length} / Normalized: ${lastListResponse?.normalizedFileCount ?? files.length}`
                : ""}
            </span>
            <span>Last refresh: {lastRefreshAt ? new Date(lastRefreshAt).toLocaleString() : "-"}</span>
          </div>

          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Filename Date (YYYY-MM-DD)</th>
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
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      {connectionState === "connected" ? "No files match the selected filters." : "Run a test/list command to view available files."}
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => (
                    <tr key={`${file.fullPath}-${file.name}`} className="border-b border-border/60">
                      <td className="px-3 py-2 font-mono">{file.name}</td>
                      <td className="px-3 py-2">{file.extractedFilenameDate || "-"}</td>
                      <td className="px-3 py-2">{file.extension ?? "-"}</td>
                      <td className="px-3 py-2">{formatBytes(file.sizeBytes)}</td>
                      <td className="px-3 py-2">{file.modifiedAt || "-"}</td>
                      <td className="px-3 py-2 font-mono">{file.path ?? file.fullPath ?? "-"}</td>
                      <td className="px-3 py-2">{file.status || file.type || (file.isDirectory ? "directory" : "file")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <details>
            <summary className="text-xs text-muted-foreground cursor-pointer">Raw JSON debug view</summary>
            <pre className="mt-2 p-3 rounded-md bg-secondary text-xs overflow-x-auto border border-border">{debugJson || JSON.stringify({
              sourceId: selectedSourceId || null,
              pathUsed: lastListResponse?.pathUsed ?? lastListResponse?.configuredPath ?? selectedSource?.remote_path ?? null,
              rawFileCount: lastListResponse?.rawFileCount ?? files.length,
              normalizedFileCount: lastListResponse?.normalizedFileCount ?? files.length,
              displayedFileCount: filteredFiles.length,
              droppedEntriesCount: lastListResponse?.droppedEntriesCount ?? 0,
              droppedEntriesPreview: lastListResponse?.droppedEntriesPreview ?? [],
              activeFilters: {
                filenameContains: nameFilter,
                dateFilterMode,
                customDate: customDate ? toYYYYMMDDFromIsoDate(customDate) : null,
                customStartDate: customStartDate ? toYYYYMMDDFromIsoDate(customStartDate) : null,
                customEndDate: customEndDate ? toYYYYMMDDFromIsoDate(customEndDate) : null,
                extensionFilter,
                sortField,
                sortDirection,
              },
            }, null, 2)}</pre>
          </details>
        </DialogContent>
      </Dialog>
    </div>
  );
}
