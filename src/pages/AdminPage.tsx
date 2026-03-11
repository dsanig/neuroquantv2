import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { dataSources, parserProfiles } from "@/lib/mock-data";

export default function AdminPage() {
  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Admin</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Active Users" value="3" />
        <MetricCard label="Active Sources" value={dataSources.filter(s => s.active).length.toString()} />
        <MetricCard label="Parser Profiles" value={parserProfiles.length.toString()} />
        <MetricCard label="System Status" value="Healthy" changeType="positive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-4">User Management</h2>
          <table className="data-table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Active</th></tr></thead>
            <tbody>
              <tr><td className="font-sans text-foreground">admin@neuroquant.io</td><td>Admin</td><td><StatusBadge status="active" /></td><td>Just now</td></tr>
              <tr><td className="font-sans text-foreground">ops@neuroquant.io</td><td>Operator</td><td><StatusBadge status="active" /></td><td>2 hours ago</td></tr>
              <tr><td className="font-sans text-foreground">viewer@neuroquant.io</td><td>Viewer</td><td><StatusBadge status="inactive" /></td><td>3 days ago</td></tr>
            </tbody>
          </table>
        </div>

        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-4">System Health</h2>
          <div className="space-y-2">
            {[
              { service: 'Database', status: 'connected', latency: '2ms' },
              { service: 'SFTP Connector', status: 'connected', latency: '145ms' },
              { service: 'PGP Engine', status: 'connected', latency: '12ms' },
              { service: 'Parser Engine', status: 'connected', latency: '8ms' },
              { service: 'Scheduler', status: 'connected', latency: '1ms' },
            ].map(s => (
              <div key={s.service} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                <span className="text-foreground font-sans">{s.service}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-muted-foreground">{s.latency}</span>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="config-panel">
        <h2 className="text-foreground font-semibold mb-4">Ingestion Oversight</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="metric-label mb-2">Source Status</div>
            {dataSources.map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                <span className="text-foreground">{s.name}</span>
                <StatusBadge status={s.active ? s.lastStatus : 'inactive'} />
              </div>
            ))}
          </div>
          <div>
            <div className="metric-label mb-2">Parser Versions</div>
            {parserProfiles.map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                <span className="text-foreground">{p.name}</span>
                <span className="font-mono text-muted-foreground">v{p.version} ({p.updatedAt})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
