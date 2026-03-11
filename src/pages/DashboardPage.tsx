import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { importBatches, dataSources, positions, strategies } from "@/lib/mock-data";

export default function DashboardPage() {
  const totalUnrealizedPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const totalNotional = positions.reduce((s, p) => s + Math.abs(p.notional), 0);
  const recentImports = importBatches.slice(0, 3);

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Dashboard</h1>
        <span className="text-xs font-mono text-muted-foreground">Last refresh: {new Date().toLocaleTimeString()}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard label="Net Liquidation" value="$1,042,380" change="+0.56%" changeType="positive" />
        <MetricCard label="Unrealized P&L" value={`$${totalUnrealizedPnl.toLocaleString()}`} change={totalUnrealizedPnl >= 0 ? "▲" : "▼"} changeType={totalUnrealizedPnl >= 0 ? 'positive' : 'negative'} />
        <MetricCard label="Realized P&L MTD" value="$18,000" change="+1.73%" changeType="positive" />
        <MetricCard label="Notional Exposure" value={`$${(totalNotional / 1000).toFixed(0)}K`} />
        <MetricCard label="Margin Used" value="$312,400" change="30.0% of NLV" />
        <MetricCard label="Premium Collected" value="$31,700" change="MTD" changeType="positive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Strategies */}
        <div className="metric-card lg:col-span-2">
          <div className="metric-label mb-3">Active Strategies</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Underlying</th>
                <th>Open P&L</th>
                <th>Realized</th>
                <th>Delta</th>
                <th>Theta</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((s) => (
                <tr key={s.name}>
                  <td className="font-sans text-foreground font-medium">{s.name}</td>
                  <td>{s.underlying}</td>
                  <td className={s.openPnl >= 0 ? 'text-success' : 'text-destructive'}>${s.openPnl.toLocaleString()}</td>
                  <td className="text-success">${s.realizedPnl.toLocaleString()}</td>
                  <td>{s.delta.toFixed(2)}</td>
                  <td>{s.theta.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pipeline Status */}
        <div className="metric-card">
          <div className="metric-label mb-3">Import Pipeline</div>
          <div className="space-y-3">
            {recentImports.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                <div>
                  <div className="text-foreground font-medium font-sans text-[13px]">{b.sourceName}</div>
                  <div className="text-muted-foreground font-mono mt-0.5">{b.fileName.slice(0, 30)}...</div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-border/50">
            <div className="metric-label mb-2">Source Health</div>
            {dataSources.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{s.name}</span>
                <StatusBadge status={s.lastStatus} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
