import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { MetricCard } from "@/components/MetricCard";
import { useExternalQuery, useExternalData, getActiveConnectionId } from "@/hooks/use-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

export default function ExternalDataPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [fredSeries, setFredSeries] = useState('DFF');
  const [fetchAV, setFetchAV] = useState(false);
  const [fetchFRED, setFetchFRED] = useState(false);
  const [fetchECB, setFetchECB] = useState(false);
  const [fetchEOD, setFetchEOD] = useState(false);
  const [fetchSEC, setFetchSEC] = useState(false);

  const ecb = useExternalData('ecb', {}, fetchECB);
  const fred = useExternalData('fred', { series_id: fredSeries }, fetchFRED);
  const av = useExternalData('alpha_vantage', { symbol, fn: 'TIME_SERIES_DAILY_ADJUSTED' }, fetchAV);
  const eod = useExternalData('eodhd', { symbol: `${symbol}.US` }, fetchEOD);
  const sec = useExternalData('sec_edgar', { ticker: symbol }, fetchSEC);

  const autoCols = (rows: Record<string, unknown>[]) => {
    if (!rows.length) return [];
    return Object.keys(rows[0]).slice(0, 8).map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
  };

  const renderProviderTab = (name: string, q: any, onFetch: () => void) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onFetch} disabled={q.isLoading}>
          {q.isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
          Fetch {name}
        </Button>
        {q.isError && <span className="text-xs text-destructive">{(q.error as Error)?.message}</span>}
      </div>
      {q.data && !q.isError && (
        <div className="metric-card">
          {Array.isArray(q.data.data) ? (
            <DataTable columns={autoCols(q.data.data)} data={q.data.data.slice(0, 50)} stickyHeader />
          ) : q.data.observations ? (
            <DataTable columns={[{ key: 'date', label: 'Date' }, { key: 'value', label: 'Value' }]} data={q.data.observations.slice(0, 50)} stickyHeader />
          ) : (
            <pre className="text-xs font-mono text-muted-foreground overflow-x-auto p-3">{JSON.stringify(q.data, null, 2).slice(0, 3000)}</pre>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="page-container">
      <div className="section-header"><h1 className="section-title">External Data</h1></div>

      <div className="flex gap-3 mb-4 items-end">
        <div>
          <label className="config-label">Symbol</label>
          <Input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} className="w-32 bg-secondary border-border" />
        </div>
        <div>
          <label className="config-label">FRED Series</label>
          <Input value={fredSeries} onChange={e => setFredSeries(e.target.value.toUpperCase())} className="w-32 bg-secondary border-border" />
        </div>
      </div>

      <Tabs defaultValue="ecb">
        <TabsList>
          <TabsTrigger value="ecb">ECB FX Rates</TabsTrigger>
          <TabsTrigger value="fred">FRED</TabsTrigger>
          <TabsTrigger value="av">Alpha Vantage</TabsTrigger>
          <TabsTrigger value="eodhd">EODHD</TabsTrigger>
          <TabsTrigger value="sec">SEC EDGAR</TabsTrigger>
        </TabsList>
        <TabsContent value="ecb">{renderProviderTab('ECB', ecb, () => setFetchECB(true))}</TabsContent>
        <TabsContent value="fred">{renderProviderTab('FRED', fred, () => setFetchFRED(true))}</TabsContent>
        <TabsContent value="av">{renderProviderTab('Alpha Vantage', av, () => setFetchAV(true))}</TabsContent>
        <TabsContent value="eodhd">{renderProviderTab('EODHD', eod, () => setFetchEOD(true))}</TabsContent>
        <TabsContent value="sec">{renderProviderTab('SEC EDGAR', sec, () => setFetchSEC(true))}</TabsContent>
      </Tabs>
    </div>
  );
}
