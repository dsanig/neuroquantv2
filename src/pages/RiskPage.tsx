import { positions, strategies } from "@/lib/mock-data";
import { MetricCard } from "@/components/MetricCard";

export default function RiskPage() {
  const totalDelta = positions.reduce((s, p) => s + (p.delta || 0) * Math.abs(p.quantity), 0);
  const totalTheta = positions.reduce((s, p) => s + (p.theta || 0) * Math.abs(p.quantity), 0);
  const totalGamma = positions.reduce((s, p) => s + (p.gamma || 0) * Math.abs(p.quantity), 0);
  const totalVega = positions.reduce((s, p) => s + (p.vega || 0) * Math.abs(p.quantity), 0);

  const underlyings = [...new Set(positions.map(p => p.underlying))];
  const byUnderlying = underlyings.map(u => {
    const ps = positions.filter(p => p.underlying === u);
    return {
      underlying: u,
      notional: ps.reduce((s, p) => s + Math.abs(p.notional), 0),
      delta: ps.reduce((s, p) => s + (p.delta || 0) * Math.abs(p.quantity), 0),
      unrealizedPnl: ps.reduce((s, p) => s + p.unrealizedPnl, 0),
      positions: ps.length,
    };
  });

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Risk</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Portfolio Delta" value={totalDelta.toFixed(1)} />
        <MetricCard label="Portfolio Theta" value={totalTheta.toFixed(1)} change="Daily decay" changeType={totalTheta > 0 ? 'positive' : 'negative'} />
        <MetricCard label="Portfolio Gamma" value={totalGamma.toFixed(2)} />
        <MetricCard label="Portfolio Vega" value={totalVega.toFixed(1)} />
      </div>

      <div className="metric-card">
        <div className="metric-label mb-3">Exposure by Underlying</div>
        <table className="data-table">
          <thead>
            <tr><th>Underlying</th><th>Positions</th><th>Notional</th><th>Net Delta</th><th>Unrealized P&L</th></tr>
          </thead>
          <tbody>
            {byUnderlying.map(u => (
              <tr key={u.underlying}>
                <td className="font-sans font-medium text-foreground">{u.underlying}</td>
                <td>{u.positions}</td>
                <td>${(u.notional / 1000).toFixed(0)}K</td>
                <td>{u.delta.toFixed(1)}</td>
                <td className={u.unrealizedPnl >= 0 ? 'text-success' : 'text-destructive'}>${u.unrealizedPnl.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="metric-card">
        <div className="metric-label mb-3">Strategy Risk Summary</div>
        <table className="data-table">
          <thead>
            <tr><th>Strategy</th><th>Delta</th><th>Theta</th><th>Max Risk</th><th>Open P&L</th></tr>
          </thead>
          <tbody>
            {strategies.map(s => (
              <tr key={s.name}>
                <td className="font-sans font-medium text-foreground">{s.name}</td>
                <td>{s.delta.toFixed(2)}</td>
                <td className="text-success">{s.theta.toFixed(2)}</td>
                <td className="text-destructive">${s.maxRisk.toLocaleString()}</td>
                <td className={s.openPnl >= 0 ? 'text-success' : 'text-destructive'}>${s.openPnl.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
