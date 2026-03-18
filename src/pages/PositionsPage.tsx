import { useState } from "react";
import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { ExportButton } from "@/components/ExportButton";
import { MetricCard } from "@/components/MetricCard";
import { useOpenPositions } from "@/hooks/use-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function num(v: unknown): number { const n = Number(v); return isNaN(n) ? 0 : n; }
function fmtC(v: unknown): string { const n = num(v); return n >= 0 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }

export default function PositionsPage() {
  const { data, isLoading, isError, error } = useOpenPositions();
  const rows = (data || []) as Record<string, unknown>[];

  if (isLoading || isError || !rows.length) {
    return (
      <div className="page-container">
        <div className="section-header"><h1 className="section-title">Positions</h1></div>
        <DataStatusBanner isLoading={isLoading} isError={isError} error={error as Error} isEmpty={!isLoading && !isError && !rows.length} moduleName="Positions" requiredTables={['open_positions_data']} />
      </div>
    );
  }

  // Detect columns dynamically
  const allKeys = Object.keys(rows[0]);
  const findKey = (patterns: string[]) => allKeys.find(k => patterns.some(p => k.toLowerCase().includes(p))) || null;
  const symKey = findKey(['symbol']) || allKeys[0];
  const assetKey = findKey(['asset_class', 'assetclass', 'type']);
  const qtyKey = findKey(['quantity', 'position', 'qty']);
  const priceKey = findKey(['mark_price', 'market_price', 'close_price', 'price']);
  const costKey = findKey(['cost_basis', 'avg_cost', 'cost']);
  const mktValKey = findKey(['market_value', 'value']);
  const unrealKey = findKey(['unrealized', 'unreal']);
  const realKey = findKey(['realized', 'real']);
  const deltaKey = findKey(['delta']);
  const thetaKey = findKey(['theta']);
  const underlyingKey = findKey(['underlying', 'undl']);

  const stocks = rows.filter(r => String(r[assetKey || ''] ?? '').match(/stk|stock/i));
  const options = rows.filter(r => String(r[assetKey || ''] ?? '').match(/opt|option/i));

  const totalUnreal = rows.reduce((s, r) => s + num(r[unrealKey || '']), 0);
  const totalReal = rows.reduce((s, r) => s + num(r[realKey || '']), 0);
  const totalMktVal = rows.reduce((s, r) => s + num(r[mktValKey || '']), 0);
  const totalDelta = rows.reduce((s, r) => s + num(r[deltaKey || '']), 0);

  const cols = [
    { key: symKey, label: 'Symbol', className: 'font-sans text-foreground font-medium' },
    assetKey && { key: assetKey, label: 'Asset Class' },
    underlyingKey && { key: underlyingKey, label: 'Underlying' },
    qtyKey && { key: qtyKey, label: 'Qty', align: 'right' as const, format: (v: unknown) => <span className={num(v) < 0 ? 'text-destructive' : 'text-success'}>{String(v)}</span> },
    costKey && { key: costKey, label: 'Cost', align: 'right' as const },
    priceKey && { key: priceKey, label: 'Mkt Price', align: 'right' as const },
    mktValKey && { key: mktValKey, label: 'Mkt Value', align: 'right' as const, format: (v: unknown) => fmtC(v) },
    unrealKey && { key: unrealKey, label: 'Unreal P&L', align: 'right' as const, format: (v: unknown) => <span className={num(v) >= 0 ? 'text-success' : 'text-destructive'}>{fmtC(v)}</span> },
    realKey && { key: realKey, label: 'Real P&L', align: 'right' as const, format: (v: unknown) => <span className={num(v) >= 0 ? 'text-success' : 'text-destructive'}>{fmtC(v)}</span> },
    deltaKey && { key: deltaKey, label: 'Delta', align: 'right' as const },
    thetaKey && { key: thetaKey, label: 'Theta', align: 'right' as const },
  ].filter(Boolean) as any[];

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Positions</h1>
        <ExportButton data={rows} filename="positions" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Positions" value={String(rows.length)} />
        <MetricCard label="Market Value" value={fmtC(totalMktVal)} />
        <MetricCard label="Unrealized P&L" value={fmtC(totalUnreal)} changeType={totalUnreal >= 0 ? 'positive' : 'negative'} />
        <MetricCard label="Net Delta" value={totalDelta.toFixed(1)} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
          <TabsTrigger value="stocks">Stocks ({stocks.length})</TabsTrigger>
          <TabsTrigger value="options">Options ({options.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div className="metric-card">
            <DataTable columns={cols} data={rows} searchable searchKeys={[symKey, underlyingKey || symKey]} stickyHeader />
          </div>
        </TabsContent>
        <TabsContent value="stocks">
          <div className="metric-card">
            <DataTable columns={cols} data={stocks} searchable searchKeys={[symKey]} stickyHeader />
          </div>
        </TabsContent>
        <TabsContent value="options">
          <div className="metric-card">
            <DataTable columns={cols} data={options} searchable searchKeys={[symKey, underlyingKey || symKey]} stickyHeader />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
