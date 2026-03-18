import { MetricCard } from "@/components/MetricCard";
import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { ExportButton } from "@/components/ExportButton";
import { useExternalQuery, useRiskMeasures, useConcentration } from "@/hooks/use-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function num(v: unknown): number { const n = Number(v); return isNaN(n) ? 0 : n; }

export default function RiskPage() {
  const greeks = useExternalQuery(['risk-greeks-agg'], `
    SELECT 
      sum(delta) as total_delta, sum(gamma) as total_gamma,
      sum(theta) as total_theta, sum(vega) as total_vega
    FROM greeks
  `, { transform: r => r[0] || null });

  const risk = useRiskMeasures();
  const concSymbol = useConcentration('symbol');
  const concSector = useConcentration('sector');
  const concAsset = useConcentration('assetclass');

  const greeksData = greeks.data as Record<string, unknown> | null;
  const riskRows = (risk.data || []) as Record<string, unknown>[];

  const isLoading = greeks.isLoading && risk.isLoading;
  const isError = greeks.isError && risk.isError;

  if (isLoading || (isError && !riskRows.length)) {
    return (
      <div className="page-container">
        <div className="section-header"><h1 className="section-title">Risk</h1></div>
        <DataStatusBanner isLoading={isLoading} isError={isError} error={greeks.error as Error || risk.error as Error} isEmpty={false} moduleName="Risk" requiredTables={['greeks', 'risk_measures', 'concentration_symbol']} />
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
        <h1 className="section-title">Risk</h1>
        <ExportButton data={riskRows} filename="risk_measures" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Portfolio Delta" value={num(greeksData?.total_delta).toFixed(1)} />
        <MetricCard label="Portfolio Theta" value={num(greeksData?.total_theta).toFixed(1)} change="Daily decay" changeType={num(greeksData?.total_theta) > 0 ? 'positive' : 'negative'} />
        <MetricCard label="Portfolio Gamma" value={num(greeksData?.total_gamma).toFixed(2)} />
        <MetricCard label="Portfolio Vega" value={num(greeksData?.total_vega).toFixed(1)} />
      </div>

      {riskRows.length > 0 && (
        <div className="metric-card">
          <div className="metric-label mb-3">Risk Measures</div>
          <DataTable columns={autoCols(riskRows)} data={riskRows} stickyHeader />
        </div>
      )}

      <Tabs defaultValue="symbol">
        <TabsList>
          <TabsTrigger value="symbol">By Symbol</TabsTrigger>
          <TabsTrigger value="sector">By Sector</TabsTrigger>
          <TabsTrigger value="asset">By Asset Class</TabsTrigger>
        </TabsList>
        {[{ key: 'symbol', q: concSymbol }, { key: 'sector', q: concSector }, { key: 'asset', q: concAsset }].map(({ key, q }) => (
          <TabsContent key={key} value={key}>
            <div className="metric-card">
              <div className="metric-label mb-3">Concentration — {key}</div>
              {q.isLoading ? (
                <DataStatusBanner isLoading moduleName={`Concentration ${key}`} isError={false} />
              ) : q.isError ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Table not available: concentration_{key}</div>
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
