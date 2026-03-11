import { useState } from "react";
import { trades } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function TradesPage() {
  const [filter, setFilter] = useState("");
  const filtered = trades.filter(t =>
    t.symbol.toLowerCase().includes(filter.toLowerCase()) ||
    t.strategy.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Trades</h1>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Filter trades..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-8 text-sm bg-secondary border-border" />
        </div>
      </div>
      <div className="metric-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Type</th>
              <th>Side</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Commission</th>
              <th>Strategy</th>
              <th>Source</th>
              <th>Roll</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td className="font-sans text-foreground font-medium">{t.symbol}</td>
                <td>{t.type}</td>
                <td className={t.side === 'BUY' ? 'text-success' : 'text-destructive'}>{t.side}</td>
                <td>{t.quantity}</td>
                <td>${t.price.toFixed(2)}</td>
                <td className="text-muted-foreground">${t.commission.toFixed(2)}</td>
                <td className="font-sans text-muted-foreground">{t.strategy}</td>
                <td className="text-muted-foreground">{t.source}</td>
                <td>{t.isRoll ? <span className="status-badge status-info">ROLL</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
