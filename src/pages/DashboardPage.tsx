import { MetricCard } from "@/components/MetricCard";
import { DataStatusBanner } from "@/components/DataStatusBanner";
import { StatusBadge } from "@/components/StatusBadge";
import { useExternalQuery, getActiveConnectionId } from "@/hooks/use-analytics";
import { useDatabaseConnections } from "@/hooks/use-pipeline";
import { Link } from "react-router-dom";

function fmtCurrency(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return '—';
  return n >= 0 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtPct(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function fmtNum(v: unknown, dec = 2): string {
  const n = Number(v);
  return isNaN(n) ? '—' : n.toFixed(dec);
}

export default function DashboardPage() {
  const connId = getActiveConnectionId();
  const { data: connections } = useDatabaseConnections();
  const activeConn = (connections || []).find(c => c.id === connId);

  // NAV query — tries cnav first
  const nav = useExternalQuery(['dash-nav'], `SELECT * FROM cnav ORDER BY report_date DESC LIMIT 1`, { transform: r => r[0] || null });
  // Positions summary
  const pos = useExternalQuery(['dash-pos-summary'], `
    SELECT 
      count(*) as position_count,
      sum(CASE WHEN asset_class IN ('STK','Stock') THEN market_value ELSE 0 END) as stock_value,
      sum(CASE WHEN asset_class IN ('OPT','Option') THEN market_value ELSE 0 END) as option_value,
      sum(unrealized_pnl) as total_unrealized,
      sum(realized_pnl) as total_realized,
      sum(delta_dollars) as total_delta,
      sum(theta) as total_theta,
      sum(gamma) as total_gamma,
      sum(vega) as total_vega
    FROM open_positions_data
  `, { transform: r => r[0] || null });
  // Cash
  const cash = useExternalQuery(['dash-cash'], `SELECT sum(total) as total_cash, sum(settled_cash) as settled FROM cash_report`, { transform: r => r[0] || null });
  // Recent trades
  const recentTrades = useExternalQuery(['dash-recent-trades'], `SELECT symbol, trade_date, quantity, trade_price, buy_sell FROM trnt ORDER BY trade_date DESC, trade_time DESC LIMIT 8`);
  // Performance
  const perf = useExternalQuery(['dash-perf'], `SELECT * FROM key_statistics LIMIT 20`);

  const isLoading = nav.isLoading || pos.isLoading;
  const isError = nav.isError && pos.isError;
  const noConn = !connId;

  if (noConn || isError) {
    return (
      <div className="page-container">
        <div className="section-header">
          <h1 className="section-title">Dashboard</h1>
          <span className="text-xs font-mono text-muted-foreground">Last refresh: {new Date().toLocaleTimeString()}</span>
        </div>
        <DataStatusBanner isLoading={false} isError={isError} error={nav.error as Error || pos.error as Error} isEmpty={noConn} moduleName="Dashboard" requiredTables={['cnav', 'open_positions_data', 'cash_report', 'trnt']} />
      </div>
    );
  }

  const navData = nav.data as Record<string, unknown> | null;
  const posData = pos.data as Record<string, unknown> | null;
  const cashData = cash.data as Record<string, unknown> | null;

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Dashboard</h1>
        <div className="flex items-center gap-3">
          {activeConn && (
            <span className="text-xs font-mono text-muted-foreground">
              {activeConn.name} · {activeConn.host}
            </span>
          )}
          <span className="text-xs font-mono text-muted-foreground">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {isLoading ? (
        <DataStatusBanner isLoading={true} isError={false} moduleName="Dashboard" />
      ) : (
        <>
          {/* KPI Row 1: NAV & Returns */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <MetricCard label="Net Asset Value" value={fmtCurrency(navData?.net_asset_value ?? navData?.nav ?? navData?.total)} />
            <MetricCard label="Daily Return" value={fmtPct(navData?.daily_return ?? navData?.change_pct)} changeType={Number(navData?.daily_return ?? 0) >= 0 ? 'positive' : 'negative'} />
            <MetricCard label="Unrealized P&L" value={fmtCurrency(posData?.total_unrealized)} changeType={Number(posData?.total_unrealized ?? 0) >= 0 ? 'positive' : 'negative'} />
            <MetricCard label="Realized P&L" value={fmtCurrency(posData?.total_realized)} changeType={Number(posData?.total_realized ?? 0) >= 0 ? 'positive' : 'negative'} />
            <MetricCard label="Cash Balance" value={fmtCurrency(cashData?.total_cash)} />
            <MetricCard label="Settled Cash" value={fmtCurrency(cashData?.settled)} />
          </div>

          {/* KPI Row 2: Portfolio Composition */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <MetricCard label="Stock Value" value={fmtCurrency(posData?.stock_value)} />
            <MetricCard label="Options Value" value={fmtCurrency(posData?.option_value)} />
            <MetricCard label="Positions" value={String(posData?.position_count ?? '—')} />
            <MetricCard label="Portfolio Delta" value={fmtNum(posData?.total_delta)} />
            <MetricCard label="Portfolio Theta" value={fmtNum(posData?.total_theta)} changeType={Number(posData?.total_theta ?? 0) > 0 ? 'positive' : 'negative'} />
            <MetricCard label="Portfolio Vega" value={fmtNum(posData?.total_vega)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Key Statistics */}
            <div className="metric-card lg:col-span-2">
              <div className="metric-label mb-3">Key Statistics</div>
              {perf.isLoading ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Loading...</div>
              ) : perf.isError ? (
                <div className="text-xs text-destructive py-2">Failed to load: {(perf.error as Error)?.message}</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                  <tbody>
                    {((perf.data as Record<string, unknown>[]) || []).map((row, i) => {
                      const keys = Object.keys(row);
                      const nameKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('metric') || k.toLowerCase().includes('statistic')) || keys[0];
                      const valKey = keys.find(k => k.toLowerCase().includes('value') || k.toLowerCase().includes('amount')) || keys[1];
                      return (
                        <tr key={i}>
                          <td className="font-sans text-foreground">{String(row[nameKey] ?? '')}</td>
                          <td>{String(row[valKey] ?? '')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recent Trades */}
            <div className="metric-card">
              <div className="flex items-center justify-between mb-3">
                <div className="metric-label">Recent Trades</div>
                <Link to="/trades" className="text-xs text-primary hover:underline">View All</Link>
              </div>
              {recentTrades.isLoading ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {((recentTrades.data as Record<string, unknown>[]) || []).map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs border-b border-border/50 pb-1.5">
                      <div>
                        <div className="text-foreground font-sans font-medium text-[13px]">{String(t.symbol ?? '')}</div>
                        <div className="text-muted-foreground font-mono mt-0.5">{String(t.trade_date ?? '')}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono ${String(t.buy_sell ?? '').toUpperCase().includes('BUY') ? 'text-success' : 'text-destructive'}`}>
                          {String(t.buy_sell ?? '')} {String(t.quantity ?? '')}
                        </div>
                        <div className="text-muted-foreground font-mono">${String(t.trade_price ?? '')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
