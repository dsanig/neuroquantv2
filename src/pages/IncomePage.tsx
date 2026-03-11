import { MetricCard } from "@/components/MetricCard";
import { incomeEvents } from "@/lib/mock-data";

export default function IncomePage() {
  const premiumTotal = incomeEvents.filter(e => e.type === 'Premium').reduce((s, e) => s + e.amount, 0);
  const dividendTotal = incomeEvents.filter(e => e.type === 'Dividend').reduce((s, e) => s + e.amount, 0);
  const interestTotal = incomeEvents.filter(e => e.type === 'Interest').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Income</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Income" value={`$${(premiumTotal + dividendTotal + interestTotal).toLocaleString()}`} changeType="positive" />
        <MetricCard label="Premium Income" value={`$${premiumTotal.toLocaleString()}`} />
        <MetricCard label="Dividends" value={`$${dividendTotal.toLocaleString()}`} />
        <MetricCard label="Interest" value={`$${interestTotal.toLocaleString()}`} />
      </div>

      <div className="metric-card">
        <div className="metric-label mb-3">Income Events</div>
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Symbol</th><th>Amount</th><th>Strategy</th></tr>
          </thead>
          <tbody>
            {incomeEvents.map(e => (
              <tr key={e.id}>
                <td>{e.date}</td>
                <td><span className={`status-badge ${e.type === 'Premium' ? 'status-info' : e.type === 'Dividend' ? 'status-success' : 'status-neutral'}`}>{e.type}</span></td>
                <td className="font-sans text-foreground">{e.symbol}</td>
                <td className="text-success">${e.amount.toLocaleString()}</td>
                <td className="text-muted-foreground font-sans">{e.strategy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
