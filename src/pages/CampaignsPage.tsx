import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { ExportButton } from "@/components/ExportButton";
import { MetricCard } from "@/components/MetricCard";
import { useExternalQuery, useFIFO, useCommissions } from "@/hooks/use-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function num(v: unknown): number { const n = Number(v); return isNaN(n) ? 0 : n; }

export default function CampaignsPage() {
  // Option campaigns: group by underlying+strike+expiry+putcall from trades
  const campaigns = useExternalQuery(['campaigns'], `
    WITH campaign_trades AS (
      SELECT 
        underlying_symbol, strike, expiry, put_call,
        min(trade_date) as open_date,
        max(trade_date) as last_date,
        sum(CASE WHEN buy_sell = 'SELL' THEN quantity ELSE 0 END) as sold_qty,
        sum(CASE WHEN buy_sell = 'BUY' THEN quantity ELSE 0 END) as bought_qty,
        sum(CASE WHEN buy_sell = 'SELL' THEN quantity * trade_price * multiplier ELSE 0 END) as total_credit,
        sum(CASE WHEN buy_sell = 'BUY' THEN quantity * trade_price * multiplier ELSE 0 END) as total_debit,
        sum(commission) as total_commission,
        count(*) as trade_count
      FROM trnt
      WHERE asset_class IN ('OPT','Option')
      GROUP BY underlying_symbol, strike, expiry, put_call
      ORDER BY max(trade_date) DESC
    )
    SELECT *,
      total_credit - total_debit as net_premium,
      total_credit - total_debit + total_commission as net_pnl,
      CASE WHEN sold_qty + bought_qty = 0 THEN 'Closed' ELSE 'Open' END as status,
      last_date::date - open_date::date as days_held
    FROM campaign_trades
    LIMIT 500
  `);

  const fifo = useFIFO();
  const comms = useCommissions();

  const campRows = (campaigns.data || []) as Record<string, unknown>[];
  const isLoading = campaigns.isLoading;

  if (isLoading || (campaigns.isError && fifo.isError)) {
    return (
      <div className="page-container">
        <div className="section-header"><h1 className="section-title">Option Campaigns</h1></div>
        <DataStatusBanner isLoading={isLoading} isError={campaigns.isError} error={campaigns.error as Error} isEmpty={false} moduleName="Campaigns" requiredTables={['trnt']} />
      </div>
    );
  }

  const openCamps = campRows.filter(r => r.status === 'Open');
  const closedCamps = campRows.filter(r => r.status === 'Closed');
  const totalPremium = campRows.reduce((s, r) => s + num(r.net_premium), 0);
  const winners = closedCamps.filter(r => num(r.net_pnl) > 0);

  const autoCols = (rows: Record<string, unknown>[]) => {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Option Campaigns</h1>
        <ExportButton data={campRows} filename="campaigns" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Total Campaigns" value={String(campRows.length)} />
        <MetricCard label="Open" value={String(openCamps.length)} />
        <MetricCard label="Closed" value={String(closedCamps.length)} />
        <MetricCard label="Net Premium" value={`$${totalPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} changeType={totalPremium >= 0 ? 'positive' : 'negative'} />
        <MetricCard label="Win Rate" value={closedCamps.length ? `${((winners.length / closedCamps.length) * 100).toFixed(1)}%` : '—'} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({campRows.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({openCamps.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedCamps.length})</TabsTrigger>
          <TabsTrigger value="fifo">FIFO P&L</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><div className="metric-card"><DataTable columns={autoCols(campRows)} data={campRows} stickyHeader searchable searchKeys={['underlying_symbol', 'put_call']} /></div></TabsContent>
        <TabsContent value="open"><div className="metric-card"><DataTable columns={autoCols(openCamps)} data={openCamps} stickyHeader /></div></TabsContent>
        <TabsContent value="closed"><div className="metric-card"><DataTable columns={autoCols(closedCamps)} data={closedCamps} stickyHeader /></div></TabsContent>
        <TabsContent value="fifo">
          <div className="metric-card">
            {fifo.isLoading ? <DataStatusBanner isLoading moduleName="FIFO" isError={false} /> :
             fifo.isError ? <div className="text-xs text-muted-foreground py-4 text-center">FIFO table not available</div> :
             <DataTable columns={autoCols((fifo.data || []) as Record<string, unknown>[])} data={(fifo.data || []) as Record<string, unknown>[]} stickyHeader searchable searchKeys={Object.keys(((fifo.data as Record<string, unknown>[]) || [])[0] || {})} />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
