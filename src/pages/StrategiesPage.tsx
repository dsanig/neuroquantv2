import { strategies, positions } from "@/lib/mock-data";
import { MetricCard } from "@/components/MetricCard";

export default function StrategiesPage() {
  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Strategies</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map(s => {
          const legs = positions.filter(p => p.strategy === s.name);
          return (
            <div key={s.name} className="metric-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-foreground font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.underlying} · {s.legs} legs</div>
                </div>
                <span className="status-badge status-success">Active</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div><span className="metric-label">Open P&L</span><div className={`font-mono text-sm ${s.openPnl >= 0 ? 'text-success' : 'text-destructive'}`}>${s.openPnl.toLocaleString()}</div></div>
                <div><span className="metric-label">Realized</span><div className="font-mono text-sm text-success">${s.realizedPnl.toLocaleString()}</div></div>
                <div><span className="metric-label">Max Risk</span><div className="font-mono text-sm text-destructive">${s.maxRisk.toLocaleString()}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><span className="metric-label">Net Delta</span><div className="font-mono text-sm">{s.delta.toFixed(2)}</div></div>
                <div><span className="metric-label">Net Theta</span><div className="font-mono text-sm text-success">{s.theta.toFixed(2)}</div></div>
              </div>
              {legs.length > 0 && (
                <div className="border-t border-border pt-2">
                  <div className="metric-label mb-1">Legs</div>
                  {legs.map(l => (
                    <div key={l.id} className="flex justify-between text-xs font-mono py-0.5">
                      <span className="text-muted-foreground">{l.symbol}</span>
                      <span className={l.quantity < 0 ? 'text-destructive' : 'text-success'}>{l.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
