import { useState } from "react";
import { dataSources } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TestTube, Power, PowerOff } from "lucide-react";

export default function SourcesPage() {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Sources</h1>
        <Button size="sm" className="text-xs"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Source</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {dataSources.map(s => (
          <div key={s.id} className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-foreground font-semibold text-sm">{s.name}</span>
              <StatusBadge status={s.active ? s.lastStatus : 'inactive'} />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Protocol</span><span className="font-mono">{s.protocol}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Host</span><span className="font-mono">{s.host}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Encrypted</span><span className="font-mono">{s.encrypted ? 'PGP' : 'No'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-mono">{s.pollingSchedule}</span></div>
              {s.lastConnected && <div className="flex justify-between"><span className="text-muted-foreground">Last Connected</span><span className="font-mono">{new Date(s.lastConnected).toLocaleString()}</span></div>}
              {s.lastError && <div className="text-destructive text-xs mt-1">{s.lastError}</div>}
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => setEditing(s.id)}>Configure</Button>
              <Button variant="outline" size="sm" className="text-xs"><TestTube className="h-3 w-3" /></Button>
              <Button variant="outline" size="sm" className="text-xs">{s.active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}</Button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="config-panel">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground font-semibold">Configure Source</h2>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Close</Button>
          </div>
          {(() => {
            const src = dataSources.find(s => s.id === editing)!;
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="config-label">Source Name</label><Input defaultValue={src.name} className="bg-secondary border-border" /></div>
                <div><label className="config-label">Type</label><Input defaultValue={src.type} className="bg-secondary border-border" /></div>
                <div><label className="config-label">Protocol</label><Input defaultValue={src.protocol} className="bg-secondary border-border" /></div>
                <div><label className="config-label">Host</label><Input defaultValue={src.host} className="bg-secondary border-border" /></div>
                <div><label className="config-label">Port</label><Input defaultValue={src.port.toString()} className="bg-secondary border-border" /></div>
                <div><label className="config-label">Username</label><Input defaultValue={src.username} className="bg-secondary border-border" /></div>
                <div><label className="config-label">Password / Secret Ref</label><Input type="password" defaultValue="••••••••" className="bg-secondary border-border" /></div>
                <div><label className="config-label">Remote Path</label><Input defaultValue={src.remotePath} className="bg-secondary border-border" /></div>
                <div><label className="config-label">Filename Pattern</label><Input defaultValue={src.filenamePattern} className="bg-secondary border-border" /></div>
                <div><label className="config-label">Polling Schedule (cron)</label><Input defaultValue={src.pollingSchedule} className="bg-secondary border-border" /></div>
                <div className="md:col-span-2 lg:col-span-3 border-t border-border pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-foreground mb-3">PGP Decryption</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label className="config-label">Encrypted</label><Input defaultValue={src.encrypted ? 'Yes' : 'No'} className="bg-secondary border-border" /></div>
                    <div><label className="config-label">Encryption Type</label><Input defaultValue="PGP/GPG" className="bg-secondary border-border" /></div>
                    <div><label className="config-label">Private Key Reference</label><Input defaultValue="vault://ibkr-pgp-key" className="bg-secondary border-border" /></div>
                    <div><label className="config-label">Armored</label><Input defaultValue="ASCII-Armored" className="bg-secondary border-border" /></div>
                    <div><label className="config-label">Passphrase Secret Ref</label><Input type="password" defaultValue="vault://ibkr-pgp-pass" className="bg-secondary border-border" /></div>
                    <div className="flex items-end"><Button variant="outline" size="sm" className="text-xs"><TestTube className="h-3 w-3 mr-1.5" />Test Decryption</Button></div>
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            <Button size="sm">Save Configuration</Button>
          </div>
        </div>
      )}
    </div>
  );
}
