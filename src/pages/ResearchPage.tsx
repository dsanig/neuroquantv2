import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { ExportButton } from "@/components/ExportButton";
import { MetricCard } from "@/components/MetricCard";
import { useExternalQuery } from "@/hooks/use-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function num(v: unknown): number { const n = Number(v); return isNaN(n) ? 0 : n; }

export default function ResearchPage() {
  // Win/loss statistics from closed campaigns
  const stats = useExternalQuery(['research-stats'], `
    WITH closed AS (
      SELECT underlying_symbol, put_call,
        sum(CASE WHEN buy_sell='SELL' THEN quantity*trade_price*multiplier ELSE 0 END) as credit,
        sum(CASE WHEN buy_sell='BUY' THEN quantity*trade_price*multiplier ELSE 0 END) as debit,
        sum(commission) as comm,
        min(trade_date) as open_date, max(trade_date) as close_date,
        sum(CASE WHEN buy_sell='SELL' THEN quantity ELSE 0 END) + sum(CASE WHEN buy_sell='BUY' THEN quantity ELSE 0 END) as remaining
      FROM trnt WHERE asset_class IN ('OPT','Option')
      GROUP BY underlying_symbol, strike, expiry, put_call
      HAVING sum(CASE WHEN buy_sell='SELL' THEN quantity ELSE 0 END) + sum(CASE WHEN buy_sell='BUY' THEN quantity ELSE 0 END) = 0
    )
    SELECT 
      count(*) as total_closed,
      sum(CASE WHEN credit-debit+comm > 0 THEN 1 ELSE 0 END) as winners,
      sum(CASE WHEN credit-debit+comm <= 0 THEN 1 ELSE 0 END) as losers,
      avg(credit-debit+comm) as avg_pnl,
      avg(CASE WHEN credit-debit+comm > 0 THEN credit-debit+comm END) as avg_winner,
      avg(CASE WHEN credit-debit+comm <= 0 THEN credit-debit+comm END) as avg_loser,
      sum(credit-debit+comm) as total_pnl,
      avg(close_date::date - open_date::date) as avg_days_held
    FROM closed
  `, { transform: r => r[0] || null });

  // Performance by underlying
  const byUnderlying = useExternalQuery(['research-by-underlying'], `
    SELECT underlying_symbol,
      count(*) as campaigns,
      sum(CASE WHEN buy_sell='SELL' THEN quantity*trade_price*multiplier ELSE 0 END) - 
      sum(CASE WHEN buy_sell='BUY' THEN quantity*trade_price*multiplier ELSE 0 END) + 
      sum(commission) as net_pnl
    FROM trnt WHERE asset_class IN ('OPT','Option')
    GROUP BY underlying_symbol
    ORDER BY net_pnl DESC
    LIMIT 50
  `);

  // Performance by put/call
  const byType = useExternalQuery(['research-by-type'], `
    SELECT put_call,
      count(*) as trades,
      sum(CASE WHEN buy_sell='SELL' THEN quantity*trade_price*multiplier ELSE 0 END) as premium_sold,
      sum(commission) as total_commission
    FROM trnt WHERE asset_class IN ('OPT','Option')
    GROUP BY put_call
  `);

  const s = stats.data as Record<string, unknown> | null;
  const isLoading = stats.isLoading;

  if (isLoading || (stats.isError && byUnderlying.isError)) {
    return (
      <div className="page-container">
        <div className="section-header"><h1 className="section-title">Research & Studies</h1></div>
        <DataStatusBanner isLoading={isLoading} isError={stats.isError} error={stats.error as Error} isEmpty={false} moduleName="Research" requiredTables={['trnt']} />
      </div>
    );
  }

  const winRate = s && num(s.total_closed) > 0 ? (num(s.winners) / num(s.total_closed) * 100).toFixed(1) : '—';
  const profitFactor = s && num(s.avg_loser) !== 0 ? Math.abs(num(s.avg_winner) / num(s.avg_loser)).toFixed(2) : '—';

  const autoCols = (rows: Record<string, unknown>[]) => {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
  };

  return (
    <div className="page-container">
      <div className="section-header"><h1 className="section-title">Research & Studies</h1></div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard label="Closed Campaigns" value={String(s?.total_closed ?? '—')} />
        <MetricCard label="Win Rate" value={`${winRate}%`} changeType={num(winRate) > 50 ? 'positive' : 'negative'} />
        <MetricCard label="Avg Winner" value={`$${num(s?.avg_winner).toFixed(0)}`} changeType="positive" />
        <MetricCard label="Avg Loser" value={`$${num(s?.avg_loser).toFixed(0)}`} changeType="negative" />
        <MetricCard label="Profit Factor" value={String(profitFactor)} />
        <MetricCard label="Avg Days Held" value={`${num(s?.avg_days_held).toFixed(0)}d`} />
      </div>

      <Tabs defaultValue="by-underlying">
        <TabsList>
          <TabsTrigger value="by-underlying">By Underlying</TabsTrigger>
          <TabsTrigger value="by-type">By Put/Call</TabsTrigger>
        </TabsList>
        <TabsContent value="by-underlying">
          <div className="metric-card">
            <DataTable columns={autoCols((byUnderlying.data || []) as Record<string, unknown>[])} data={(byUnderlying.data || []) as Record<string, unknown>[]} stickyHeader searchable searchKeys={['underlying_symbol']} />
          </div>
        </TabsContent>
        <TabsContent value="by-type">
          <div className="metric-card">
            <DataTable columns={autoCols((byType.data || []) as Record<string, unknown>[])} data={(byType.data || []) as Record<string, unknown>[]} stickyHeader />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
