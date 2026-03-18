import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { ExportButton } from "@/components/ExportButton";
import { MetricCard } from "@/components/MetricCard";
import { useTrades } from "@/hooks/use-analytics";

function num(v: unknown): number { const n = Number(v); return isNaN(n) ? 0 : n; }

export default function TradesPage() {
  const { data, isLoading, isError, error } = useTrades(1000);
  const rows = (data || []) as Record<string, unknown>[];

  if (isLoading || isError || !rows.length) {
    return (
      <div className="page-container">
        <div className="section-header"><h1 className="section-title">Trades</h1></div>
        <DataStatusBanner isLoading={isLoading} isError={isError} error={error as Error} isEmpty={!isLoading && !isError && !rows.length} moduleName="Trades" requiredTables={['trnt', 'trades_data']} />
      </div>
    );
  }

  const allKeys = Object.keys(rows[0]);
  const findKey = (patterns: string[]) => allKeys.find(k => patterns.some(p => k.toLowerCase().includes(p))) || null;
  const dateKey = findKey(['trade_date', 'date']) || allKeys[0];
  const symKey = findKey(['symbol']) || allKeys[1];
  const sideKey = findKey(['buy_sell', 'side', 'direction']);
  const qtyKey = findKey(['quantity', 'qty']);
  const priceKey = findKey(['trade_price', 'price', 'exec_price']);
  const commKey = findKey(['commission', 'comm']);
  const assetKey = findKey(['asset_class', 'assetclass']);
  const codeKey = findKey(['code', 'open_close']);

  const totalCommission = rows.reduce((s, r) => s + Math.abs(num(r[commKey || ''])), 0);
  const totalTrades = rows.length;
  const buys = rows.filter(r => String(r[sideKey || ''] ?? '').toUpperCase().includes('BUY')).length;

  const cols = [
    { key: dateKey, label: 'Date', className: 'font-sans text-foreground' },
    { key: symKey, label: 'Symbol', className: 'font-sans text-foreground font-medium' },
    assetKey && { key: assetKey, label: 'Asset' },
    sideKey && { key: sideKey, label: 'Side', format: (v: unknown) => <span className={String(v).toUpperCase().includes('BUY') ? 'text-success' : 'text-destructive'}>{String(v)}</span> },
    qtyKey && { key: qtyKey, label: 'Qty', align: 'right' as const },
    priceKey && { key: priceKey, label: 'Price', align: 'right' as const },
    commKey && { key: commKey, label: 'Commission', align: 'right' as const, format: (v: unknown) => <span className="text-muted-foreground">${Math.abs(num(v)).toFixed(2)}</span> },
    codeKey && { key: codeKey, label: 'O/C', format: (v: unknown) => <span className="status-badge status-neutral">{String(v)}</span> },
  ].filter(Boolean) as any[];

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Trades</h1>
        <ExportButton data={rows} filename="trades" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Executions" value={String(totalTrades)} />
        <MetricCard label="Buys / Sells" value={`${buys} / ${totalTrades - buys}`} />
        <MetricCard label="Total Commission" value={`$${totalCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} changeType="negative" />
        <MetricCard label="Avg Commission" value={`$${(totalCommission / (totalTrades || 1)).toFixed(2)}`} />
      </div>
      <div className="metric-card">
        <DataTable columns={cols} data={rows} searchable searchKeys={[symKey, sideKey || symKey]} stickyHeader />
      </div>
    </div>
  );
}
