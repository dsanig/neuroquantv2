import { useState } from "react";
import { useDataSources, useUpsertDataSource, useToggleSource, useTestFtpConnection, useFtpFetch, useTestPgpDecryption } from "@/hooks/use-pipeline";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TestTube, Power, PowerOff, Loader2, RefreshCw } from "lucide-react";

export default function SourcesPage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const { data: sources, isLoading, refetch } = useDataSources();
  const upsert = useUpsertDataSource();
  const toggle = useToggleSource();
  const testFtp = useTestFtpConnection();
  const fetchFtp = useFtpFetch();
  const testPgp = useTestPgpDecryption();

  const startEdit = (id: string) => {
    const src = sources?.find(s => s.id === id);
    if (src) {
      setForm({ ...src });
      setEditing(id);
      setCreating(false);
    }
  };

  const startCreate = () => {
    setForm({
      name: '', type: 'IBKR Activity Statement', protocol: 'FTP',
      host: '', port: 21, username: '', password_ref: '',
      remote_path: '/', filename_pattern: '*', polling_schedule: '0 6 * * *',
      active: true, encrypted: false, encryption_type: 'PGP',
      pgp_key_ref: '', pgp_passphrase_ref: '', pgp_armored: true,
    });
    setEditing(null);
    setCreating(true);
  };

  const handleSave = () => {
    const payload = { ...form };
    if (editing) payload.id = editing;
    upsert.mutate(payload, {
      onSuccess: () => { setEditing(null); setCreating(false); },
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
          {(sources || []).map(s => (
            <div key={s.id} className="metric-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-foreground font-semibold text-sm">{s.name}</span>
                <StatusBadge status={s.active ? (s.last_status === 'connected' ? 'completed' : s.last_status === 'error' ? 'failed' : 'pending') : 'inactive'} />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Protocol</span><span className="font-mono">{s.protocol}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Host</span><span className="font-mono">{s.host}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Port</span><span className="font-mono">{s.port}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Encrypted</span><span className="font-mono">{s.encrypted ? 'PGP' : 'No'}</span></div>
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
        <div className="config-panel">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground font-semibold">{creating ? 'New Source' : 'Configure Source'}</h2>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setCreating(false); }}>Close</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="config-label">Source Name</label><Input value={(form.name as string) || ''} onChange={e => setForm({...form, name: e.target.value})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Type</label><Input value={(form.type as string) || ''} onChange={e => setForm({...form, type: e.target.value})} className="bg-secondary border-border" /></div>
            <div>
              <label className="config-label">Protocol</label>
              <select value={(form.protocol as string) || 'FTP'} onChange={e => setForm({...form, protocol: e.target.value, port: e.target.value === 'SFTP' ? 22 : 21})} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                <option value="FTP">FTP</option>
                <option value="SFTP">SFTP</option>
              </select>
            </div>
            <div><label className="config-label">Host</label><Input value={(form.host as string) || ''} onChange={e => setForm({...form, host: e.target.value})} className="bg-secondary border-border" placeholder="ftp.example.com" /></div>
            <div><label className="config-label">Port</label><Input type="number" value={(form.port as number) || 21} onChange={e => setForm({...form, port: parseInt(e.target.value)})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Username</label><Input value={(form.username as string) || ''} onChange={e => setForm({...form, username: e.target.value})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Password / Secret Ref</label><Input type="password" value={(form.password_ref as string) || ''} onChange={e => setForm({...form, password_ref: e.target.value})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Remote Path</label><Input value={(form.remote_path as string) || '/'} onChange={e => setForm({...form, remote_path: e.target.value})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Filename Pattern</label><Input value={(form.filename_pattern as string) || '*'} onChange={e => setForm({...form, filename_pattern: e.target.value})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Polling Schedule (cron)</label><Input value={(form.polling_schedule as string) || '0 6 * * *'} onChange={e => setForm({...form, polling_schedule: e.target.value})} className="bg-secondary border-border" /></div>
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
                <select value={form.encrypted ? 'true' : 'false'} onChange={e => setForm({...form, encrypted: e.target.value === 'true'})} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div><label className="config-label">Encryption Type</label><Input value={(form.encryption_type as string) || 'PGP'} onChange={e => setForm({...form, encryption_type: e.target.value})} className="bg-secondary border-border" /></div>
              <div><label className="config-label">PGP Private Key Ref</label><Input value={(form.pgp_key_ref as string) || ''} onChange={e => setForm({...form, pgp_key_ref: e.target.value})} className="bg-secondary border-border" placeholder="vault://key-name or paste key" /></div>
              <div>
                <label className="config-label">Armored</label>
                <select value={form.pgp_armored ? 'true' : 'false'} onChange={e => setForm({...form, pgp_armored: e.target.value === 'true'})} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                  <option value="true">ASCII-Armored</option>
                  <option value="false">Binary</option>
                </select>
              </div>
              <div><label className="config-label">Passphrase Secret Ref</label><Input type="password" value={(form.pgp_passphrase_ref as string) || ''} onChange={e => setForm({...form, pgp_passphrase_ref: e.target.value})} className="bg-secondary border-border" /></div>
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
            <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
              Save Configuration
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
