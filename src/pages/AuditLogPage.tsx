import { useState } from "react";
import { auditLog } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export default function AuditLogPage() {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = auditLog.filter(a =>
    a.eventType.toLowerCase().includes(filter.toLowerCase()) ||
    a.actor.toLowerCase().includes(filter.toLowerCase()) ||
    a.entityType.toLowerCase().includes(filter.toLowerCase())
  );
  const detail = auditLog.find(a => a.id === selected);

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Audit Log</h1>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Filter events..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-8 text-sm bg-secondary border-border" />
        </div>
      </div>

      <div className="flex gap-4">
        <div className={`metric-card overflow-x-auto ${selected ? 'flex-1' : 'w-full'}`}>
          <table className="data-table">
            <thead>
              <tr><th>Timestamp</th><th>Actor</th><th>Event</th><th>Entity</th><th>Entity ID</th><th>Source</th></tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="cursor-pointer" onClick={() => setSelected(a.id)}>
                  <td>{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="font-sans text-foreground">{a.actor}</td>
                  <td><span className={`status-badge ${a.eventType.includes('failed') ? 'status-error' : a.eventType.includes('completed') ? 'status-success' : 'status-neutral'}`}>{a.eventType}</span></td>
                  <td className="text-muted-foreground">{a.entityType}</td>
                  <td className="text-muted-foreground">{a.entityId}</td>
                  <td className="text-muted-foreground">{a.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {detail && (
          <div className="metric-card w-80 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="metric-label">Event Detail</div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <div><span className="text-muted-foreground">Event:</span> <span className="font-mono text-foreground">{detail.eventType}</span></div>
              <div><span className="text-muted-foreground">Actor:</span> <span className="font-mono text-foreground">{detail.actor}</span></div>
              <div><span className="text-muted-foreground">Entity:</span> <span className="font-mono">{detail.entityType} / {detail.entityId}</span></div>
              <div><span className="text-muted-foreground">Source:</span> <span className="font-mono">{detail.source}</span></div>
              <div><span className="text-muted-foreground">Timestamp:</span> <span className="font-mono">{detail.timestamp}</span></div>
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground">Metadata:</span>
                <pre className="mt-1 bg-secondary rounded p-2 text-[11px] font-mono text-muted-foreground overflow-x-auto">{JSON.stringify(JSON.parse(detail.metadata), null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
