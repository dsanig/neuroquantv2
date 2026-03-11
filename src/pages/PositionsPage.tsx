import { useState } from "react";
import { positions } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function PositionsPage() {
  const [filter, setFilter] = useState("");
  const filtered = positions.filter(p =>
    p.symbol.toLowerCase().includes(filter.toLowerCase()) ||
    p.strategy.toLowerCase().includes(filter.toLowerCase()) ||
    p.underlying.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Positions</h1>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Filter positions..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-8 text-sm bg-secondary border-border" />
        </div>
      </div>

      <div className="metric-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Type</th>
              <th>Strategy</th>
              <th>Qty</th>
              <th>Avg Price</th>
              <th>Mkt Price</th>
              <th>Unrealized P&L</th>
              <th>Delta</th>
              <th>Theta</th>
              <th>Notional</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td className="font-sans text-foreground font-medium">{p.symbol}</td>
                <td>{p.type}</td>
                <td className="text-muted-foreground font-sans">{p.strategy}</td>
                <td className={p.quantity < 0 ? 'text-destructive' : 'text-success'}>{p.quantity}</td>
                <td>${p.avgPrice.toFixed(2)}</td>
                <td>${p.marketPrice.toFixed(2)}</td>
                <td className={p.unrealizedPnl >= 0 ? 'text-success' : 'text-destructive'}>${p.unrealizedPnl.toLocaleString()}</td>
                <td>{p.delta?.toFixed(2)}</td>
                <td>{p.theta?.toFixed(2)}</td>
                <td>${(p.notional / 1000).toFixed(0)}K</td>
                <td className="text-muted-foreground">{p.account}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
