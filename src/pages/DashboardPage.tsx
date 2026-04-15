import { MetricCard } from "@/components/MetricCard";
import { useWheelTrades, useAppSettings, useCapitalLedger } from "@/hooks/use-settings";
import { calcDashboardKPIs, calcMonthlyMetrics } from "@/lib/calculations";
import { Link } from "react-router-dom";

function getSettingNum(settings: any[], key: string, fb: number): number {
  const r = settings?.find((s: any) => s.key === key);
  if (!r) return fb;
  try { return Number(JSON.parse(String(r.value))); } catch { return fb; }
}

function fmtCur(n: number) {
  return n >= 0 ? `€${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-€${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%`; }

export default function DashboardPage() {
  const { data: trades, isLoading } = useWheelTrades();
  const { data: settings } = useAppSettings();
  const { data: ledger } = useCapitalLedger();

  const feePerContract = getSettingNum(settings || [], 'fee_per_contract', 1.25);
  const taxRate = getSettingNum(settings || [], 'estimated_tax_rate', 0.25);

  // Capital base from ledger
  const capitalBase = (ledger || []).reduce((s: number, e: any) => s + Number(e.amount), 0);

  const kpis = trades ? calcDashboardKPIs(trades as any[], feePerContract, taxRate) : null;
  const monthly = trades ? calcMonthlyMetrics(trades as any[], feePerContract) : [];

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Dashboard</h1>
        <span className="text-xs font-mono text-muted-foreground">{new Date().toLocaleString()}</span>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading dashboard...</div>
      ) : !kpis ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">No trade data yet</p>
          <p className="text-sm">Add trades in the <Link to="/wheel-tracker" className="text-primary hover:underline">Wheel Tracker</Link> to see dashboard metrics.</p>
        </div>
      ) : (
        <>
          {/* Executive Summary */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Executive Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard label="Realized P/L" value={fmtCur(kpis.totalRealizedPL)} changeType={kpis.totalRealizedPL >= 0 ? 'positive' : 'negative'} />
              <MetricCard label="Gross Premium" value={fmtCur(kpis.totalGrossPremium)} />
              <MetricCard label="Total Fees" value={fmtCur(kpis.totalFees)} />
              <MetricCard label="Capital Base" value={fmtCur(capitalBase)} />
              <MetricCard label="Capital Utilization" value={capitalBase > 0 ? fmtPct((kpis.cspCapital + kpis.ccCapital) / capitalBase) : '—'} />
              <MetricCard label="YTD Yield" value={capitalBase > 0 ? fmtPct(kpis.totalRealizedPL / capitalBase) : '—'} changeType={kpis.totalRealizedPL >= 0 ? 'positive' : 'negative'} />
            </div>
          </div>

          {/* Returns */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Returns on Closed Campaigns</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Weighted Avg ROC" value={fmtPct(kpis.weightedROC)} />
              <MetricCard label="Weighted Ann ROC" value={fmtPct(kpis.weightedAnnROC)} />
              <MetricCard label="Campaigns Closed" value={String(kpis.closedCount)} />
              <MetricCard label="Open Positions" value={String(kpis.openCount)} />
            </div>
          </div>

          {/* Open Trade Allocation */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Open Trade Allocation</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard label="CSP Capital at Risk" value={fmtCur(kpis.cspCapital)} />
              <MetricCard label="CC Capital at Risk" value={fmtCur(kpis.ccCapital)} />
              <MetricCard label="Expiring ≤14d" value={String(kpis.upcomingExpirations)} changeType={kpis.upcomingExpirations > 0 ? 'negative' : 'neutral'} />
            </div>
          </div>

          {/* Win/Loss */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Win / Loss Mechanics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <MetricCard label="Wins" value={String(kpis.wins)} />
              <MetricCard label="Losses" value={String(kpis.losses)} />
              <MetricCard label="Win Rate" value={fmtPct(kpis.winRate)} changeType={kpis.winRate >= 0.5 ? 'positive' : 'negative'} />
              <MetricCard label="Avg Gain" value={fmtCur(kpis.avgGain)} />
              <MetricCard label="Avg Loss" value={fmtCur(kpis.avgLoss)} />
              <MetricCard label="Profit Factor" value={kpis.profitFactor === Infinity ? '∞' : kpis.profitFactor.toFixed(2)} />
              <MetricCard label="Expectancy" value={fmtCur(kpis.expectancy)} changeType={kpis.expectancy >= 0 ? 'positive' : 'negative'} />
              <MetricCard label="Total Fees" value={fmtCur(kpis.totalFees)} />
            </div>
          </div>

          {/* Monthly Performance */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Monthly Performance</h2>
            {monthly.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">No closed trades yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th><th className="text-right">Realized P/L</th><th className="text-right">Gross Premium</th>
                      <th className="text-right">Trades</th><th className="text-right">Win Rate</th>
                      <th className="text-right">Wt Avg ROC</th><th className="text-right">Wt Ann ROC</th>
                      <th className="text-right">Safest Δ</th><th className="text-right">Riskiest Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map(m => (
                      <tr key={m.month}>
                        <td className="text-foreground font-sans">{m.month}</td>
                        <td className={`text-right ${m.realizedPL >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtCur(m.realizedPL)}</td>
                        <td className="text-right">{fmtCur(m.grossPremium)}</td>
                        <td className="text-right">{m.tradesClosed}</td>
                        <td className="text-right">{fmtPct(m.winRate)}</td>
                        <td className="text-right">{fmtPct(m.weightedROC)}</td>
                        <td className="text-right">{fmtPct(m.weightedAnnROC)}</td>
                        <td className="text-right">{m.safestDelta != null ? m.safestDelta.toFixed(2) : '—'}</td>
                        <td className="text-right">{m.riskiestDelta != null ? m.riskiestDelta.toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
