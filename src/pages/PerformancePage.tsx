import { MetricCard } from "@/components/MetricCard";
import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { ExportButton } from "@/components/ExportButton";
import { usePerformanceSummary, useHistoricalPerformance, useRealizedUnrealizedSummary } from "@/hooks/use-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PerformancePage() {
  const stats = usePerformanceSummary();
  const monthly = useHistoricalPerformance('month');
  const quarterly = useHistoricalPerformance('quarter');
  const yearly = useHistoricalPerformance('year');
  const realUnreal = useRealizedUnrealizedSummary();

  const statsRows = (stats.data || []) as Record<string, unknown>[];
  const isLoading = stats.isLoading;
  const isError = stats.isError;

  if (isLoading || isError || !statsRows.length) {
    return (
      <div className="page-container">
        <div className="section-header"><h1 className="section-title">Performance</h1></div>
        <DataStatusBanner isLoading={isLoading} isError={isError} error={stats.error as Error} isEmpty={!isLoading && !isError && !statsRows.length} moduleName="Performance" requiredTables={['key_statistics', 'historical_performance_annualized_month']} />
      </div>
    );
  }

  // Try to extract key stats for KPI cards
  const findStat = (patterns: string[]): string => {
    const keys = Object.keys(statsRows[0]);
    const nameKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('statistic')) || keys[0];
    const valKey = keys.find(k => k.toLowerCase().includes('value')) || keys[1];
    const match = statsRows.find(r => patterns.some(p => String(r[nameKey] ?? '').toLowerCase().includes(p)));
    return match ? String(match[valKey] ?? '—') : '—';
  };

  const autoCols = (rows: Record<string, unknown>[]) => {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Performance</h1>
        <ExportButton data={statsRows} filename="performance_stats" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="YTD Return" value={findStat(['ytd return', 'ytd'])} />
        <MetricCard label="MTD Return" value={findStat(['mtd return', 'mtd'])} />
        <MetricCard label="Sharpe Ratio" value={findStat(['sharpe'])} />
        <MetricCard label="Max Drawdown" value={findStat(['drawdown', 'max dd'])} />
      </div>

      <div className="metric-card">
        <div className="metric-label mb-3">Key Statistics</div>
        <DataTable columns={autoCols(statsRows)} data={statsRows} stickyHeader />
      </div>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
          <TabsTrigger value="realized">Realized/Unrealized</TabsTrigger>
        </TabsList>
        {[{ key: 'monthly', q: monthly }, { key: 'quarterly', q: quarterly }, { key: 'yearly', q: yearly }, { key: 'realized', q: realUnreal }].map(({ key, q }) => (
          <TabsContent key={key} value={key}>
            <div className="metric-card">
              {q.isLoading ? (
                <DataStatusBanner isLoading moduleName={key} isError={false} />
              ) : q.isError ? (
                <DataStatusBanner isLoading={false} isError error={q.error as Error} moduleName={key} />
              ) : (
                <DataTable columns={autoCols((q.data || []) as Record<string, unknown>[])} data={(q.data || []) as Record<string, unknown>[]} stickyHeader />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
