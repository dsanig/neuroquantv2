import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { ExportButton } from "@/components/ExportButton";
import { MetricCard } from "@/components/MetricCard";
import { useExternalQuery, useTradeSummaryBySymbol, useTradeSummaryByAssetClass } from "@/hooks/use-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StrategiesPage() {
  const bySymbol = useTradeSummaryBySymbol();
  const byAsset = useTradeSummaryByAssetClass();
  const optDist = useExternalQuery(['strat-opt-dist'], `SELECT * FROM options_distribution_by_expiration ORDER BY 1`);

  const symRows = (bySymbol.data || []) as Record<string, unknown>[];
  const assetRows = (byAsset.data || []) as Record<string, unknown>[];

  const isLoading = bySymbol.isLoading;
  const isError = bySymbol.isError && byAsset.isError;

  if (isLoading || (isError && !symRows.length)) {
    return (
      <div className="page-container">
        <div className="section-header"><h1 className="section-title">Strategies</h1></div>
        <DataStatusBanner isLoading={isLoading} isError={isError} error={bySymbol.error as Error} isEmpty={!isLoading && !isError && !symRows.length} moduleName="Strategies" requiredTables={['trade_summary_by_symbol', 'trade_summary_by_asset_class', 'options_distribution_by_expiration']} />
      </div>
    );
  }

  const autoCols = (rows: Record<string, unknown>[]) => {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Strategies & Analysis</h1>
        <ExportButton data={symRows} filename="strategy_summary" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard label="Symbols Traded" value={String(symRows.length)} />
        <MetricCard label="Asset Classes" value={String(assetRows.length)} />
        <MetricCard label="Expiry Buckets" value={String(((optDist.data || []) as unknown[]).length)} />
      </div>

      <Tabs defaultValue="by-symbol">
        <TabsList>
          <TabsTrigger value="by-symbol">By Symbol</TabsTrigger>
          <TabsTrigger value="by-asset">By Asset Class</TabsTrigger>
          <TabsTrigger value="by-expiry">Options by Expiry</TabsTrigger>
        </TabsList>
        {[
          { key: 'by-symbol', q: bySymbol },
          { key: 'by-asset', q: byAsset },
          { key: 'by-expiry', q: optDist },
        ].map(({ key, q }) => (
          <TabsContent key={key} value={key}>
            <div className="metric-card">
              {q.isLoading ? (
                <DataStatusBanner isLoading moduleName={key} isError={false} />
              ) : q.isError ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Table not available</div>
              ) : (
                <DataTable columns={autoCols((q.data || []) as Record<string, unknown>[])} data={(q.data || []) as Record<string, unknown>[]} stickyHeader searchable searchKeys={Object.keys(((q.data as Record<string, unknown>[]) || [])[0] || {})} />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
