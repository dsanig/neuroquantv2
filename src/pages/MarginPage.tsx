import { MetricCard } from "@/components/MetricCard";
import { strategies } from "@/lib/mock-data";

export default function MarginPage() {
  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Margin</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Initial Margin" value="$312,400" />
        <MetricCard label="Maintenance Margin" value="$248,200" />
        <MetricCard label="Excess Liquidity" value="$730,180" change="70.0% NLV" changeType="positive" />
        <MetricCard label="Broker Requirement" value="$285,600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="metric-card">
          <div className="metric-label mb-3">Margin by Strategy</div>
          <table className="data-table">
            <thead>
              <tr><th>Strategy</th><th>Margin Used</th><th>% of Total</th><th>Max Risk</th></tr>
            </thead>
            <tbody>
              {[
                { name: 'SPY Iron Condor', margin: 85000, pct: 27.2, maxRisk: -15000 },
                { name: 'AAPL Covered Call', margin: 89250, pct: 28.6, maxRisk: -89250 },
                { name: 'QQQ Put Spread', margin: 72000, pct: 23.1, maxRisk: -16000 },
                { name: 'TSLA Strangle', margin: 66150, pct: 21.2, maxRisk: -25000 },
              ].map(m => (
                <tr key={m.name}>
                  <td className="font-sans font-medium text-foreground">{m.name}</td>
                  <td>${m.margin.toLocaleString()}</td>
                  <td>{m.pct}%</td>
                  <td className="text-destructive">${m.maxRisk.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="metric-card">
          <div className="metric-label mb-3">Margin by Underlying</div>
          <table className="data-table">
            <thead>
              <tr><th>Underlying</th><th>Margin</th><th>Notional</th><th>Margin/Notional</th></tr>
            </thead>
            <tbody>
              {[
                { name: 'SPY', margin: 85000, notional: 1960000, ratio: 4.3 },
                { name: 'AAPL', margin: 89250, notional: 183650, ratio: 48.6 },
                { name: 'QQQ', margin: 72000, notional: 624000, ratio: 11.5 },
                { name: 'TSLA', margin: 66150, notional: 141000, ratio: 46.9 },
              ].map(m => (
                <tr key={m.name}>
                  <td className="font-sans font-medium text-foreground">{m.name}</td>
                  <td>${m.margin.toLocaleString()}</td>
                  <td>${(m.notional / 1000).toFixed(0)}K</td>
                  <td>{m.ratio}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
