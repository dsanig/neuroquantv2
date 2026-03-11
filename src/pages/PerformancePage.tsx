import { MetricCard } from "@/components/MetricCard";
import { performanceData } from "@/lib/mock-data";

export default function PerformancePage() {
  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Performance</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="YTD Return" value="+1.49%" changeType="positive" />
        <MetricCard label="YTD P&L" value="$14,860" changeType="positive" />
        <MetricCard label="Sharpe (Ann.)" value="1.82" />
        <MetricCard label="Max Drawdown" value="-0.32%" changeType="negative" />
      </div>

      <div className="metric-card">
        <div className="metric-label mb-3">Monthly Performance</div>
        <table className="data-table">
          <thead>
            <tr><th>Period</th><th>P&L</th><th>Cumulative</th><th>Return %</th></tr>
          </thead>
          <tbody>
            {performanceData.map(p => (
              <tr key={p.period}>
                <td className="font-sans text-foreground font-medium">{p.period}</td>
                <td className={p.pnl >= 0 ? 'text-success' : 'text-destructive'}>${p.pnl.toLocaleString()}</td>
                <td>${p.cumulative.toLocaleString()}</td>
                <td className={p.return >= 0 ? 'text-success' : 'text-destructive'}>{p.return > 0 ? '+' : ''}{p.return}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="metric-card">
          <div className="metric-label mb-3">Contribution by Strategy</div>
          <table className="data-table">
            <thead><tr><th>Strategy</th><th>P&L Contribution</th><th>% of Total</th></tr></thead>
            <tbody>
              {[
                { name: 'SPY Iron Condor', pnl: 5800, pct: 39 },
                { name: 'AAPL Covered Call', pnl: 10150, pct: 68 },
                { name: 'QQQ Put Spread', pnl: 3820, pct: 26 },
                { name: 'TSLA Strangle', pnl: 1890, pct: 13 },
              ].map(s => (
                <tr key={s.name}>
                  <td className="font-sans text-foreground">{s.name}</td>
                  <td className="text-success">${s.pnl.toLocaleString()}</td>
                  <td>{s.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="metric-card">
          <div className="metric-label mb-3">Contribution by Type</div>
          <table className="data-table">
            <thead><tr><th>Type</th><th>Amount</th><th>% of Total</th></tr></thead>
            <tbody>
              {[
                { type: 'Premium Income', amount: 31700, pct: 78 },
                { type: 'Capital Gains', amount: 8200, pct: 20 },
                { type: 'Dividends', amount: 460, pct: 1 },
                { type: 'Interest', amount: 340, pct: 1 },
              ].map(t => (
                <tr key={t.type}>
                  <td className="font-sans text-foreground">{t.type}</td>
                  <td className="text-success">${t.amount.toLocaleString()}</td>
                  <td>{t.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
