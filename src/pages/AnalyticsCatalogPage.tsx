import { DataTable } from "@/components/DataTable";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";

interface MetricDef {
  name: string;
  formula: string;
  sourceTables: string;
  enrichment: string;
  unit: string;
  refresh: string;
  caveats: string;
  module: string;
}

const METRICS: MetricDef[] = [
  // Portfolio Basics
  { name: 'Net Asset Value', formula: 'Total from cnav or change_in_nav', sourceTables: 'cnav', enrichment: '—', unit: 'USD', refresh: 'Daily', caveats: 'End-of-day snapshot', module: 'Dashboard' },
  { name: 'Unrealized P&L', formula: 'SUM(unrealized_pnl) from open_positions_data', sourceTables: 'open_positions_data', enrichment: '—', unit: 'USD', refresh: 'Daily', caveats: 'Mark-to-market', module: 'Dashboard' },
  { name: 'Realized P&L', formula: 'SUM(realized_pnl) from open_positions_data or trnt', sourceTables: 'open_positions_data, trnt', enrichment: '—', unit: 'USD', refresh: 'Daily', caveats: 'FIFO basis', module: 'Dashboard' },
  { name: 'Cash Balance', formula: 'SUM(total) from cash_report', sourceTables: 'cash_report', enrichment: '—', unit: 'USD', refresh: 'Daily', caveats: 'Multi-currency converted', module: 'Dashboard' },
  { name: 'Stock Value', formula: 'SUM(market_value) WHERE asset_class=STK', sourceTables: 'open_positions_data', enrichment: '—', unit: 'USD', refresh: 'Daily', caveats: '', module: 'Portfolio' },
  { name: 'Options Value', formula: 'SUM(market_value) WHERE asset_class=OPT', sourceTables: 'open_positions_data', enrichment: '—', unit: 'USD', refresh: 'Daily', caveats: '', module: 'Portfolio' },
  // Greeks
  { name: 'Portfolio Delta', formula: 'SUM(delta) from greeks', sourceTables: 'greeks', enrichment: '—', unit: 'Contracts', refresh: 'Daily', caveats: 'Delta-adjusted', module: 'Risk' },
  { name: 'Portfolio Theta', formula: 'SUM(theta) from greeks', sourceTables: 'greeks', enrichment: '—', unit: 'USD/day', refresh: 'Daily', caveats: 'Assumes constant decay', module: 'Risk' },
  { name: 'Portfolio Gamma', formula: 'SUM(gamma) from greeks', sourceTables: 'greeks', enrichment: '—', unit: 'Contracts/1%', refresh: 'Daily', caveats: '', module: 'Risk' },
  { name: 'Portfolio Vega', formula: 'SUM(vega) from greeks', sourceTables: 'greeks', enrichment: '—', unit: 'USD/1% IV', refresh: 'Daily', caveats: '', module: 'Risk' },
  // Performance
  { name: 'Daily Return', formula: 'change_pct from cnav', sourceTables: 'cnav', enrichment: '—', unit: '%', refresh: 'Daily', caveats: 'Time-weighted', module: 'Performance' },
  { name: 'YTD Return', formula: 'From key_statistics', sourceTables: 'key_statistics', enrichment: '—', unit: '%', refresh: 'Daily', caveats: '', module: 'Performance' },
  { name: 'Sharpe Ratio', formula: 'From risk_measures or key_statistics', sourceTables: 'risk_measures', enrichment: 'FRED (risk-free rate)', unit: 'Ratio', refresh: 'Monthly', caveats: 'Annualized', module: 'Performance' },
  { name: 'Max Drawdown', formula: 'From risk_measures or key_statistics', sourceTables: 'risk_measures', enrichment: '—', unit: '%', refresh: 'Daily', caveats: 'Peak-to-trough', module: 'Risk' },
  // Income
  { name: 'Premium Collected', formula: 'SUM(credit) from option campaigns', sourceTables: 'trnt', enrichment: '—', unit: 'USD', refresh: 'Per trade', caveats: 'Gross of commissions', module: 'Income' },
  { name: 'Dividend Income', formula: 'SUM from open_dividend_accruals', sourceTables: 'open_dividend_accruals', enrichment: 'Alpha Vantage, EODHD', unit: 'USD', refresh: 'Daily', caveats: 'Accrual basis', module: 'Income' },
  { name: 'Interest Income', formula: 'SUM from interest_details', sourceTables: 'interest_details', enrichment: '—', unit: 'USD', refresh: 'Monthly', caveats: '', module: 'Income' },
  // Campaign
  { name: 'Win Rate', formula: 'Winners / Total closed campaigns', sourceTables: 'trnt', enrichment: '—', unit: '%', refresh: 'Per close', caveats: 'Excludes open campaigns', module: 'Research' },
  { name: 'Profit Factor', formula: 'avg_winner / |avg_loser|', sourceTables: 'trnt', enrichment: '—', unit: 'Ratio', refresh: 'Per close', caveats: '', module: 'Research' },
  { name: 'Avg Days Held', formula: 'AVG(close_date - open_date) for closed campaigns', sourceTables: 'trnt', enrichment: '—', unit: 'Days', refresh: 'Per close', caveats: '', module: 'Research' },
  // External
  { name: 'EUR/USD Rate', formula: 'Latest from ECB data API', sourceTables: '—', enrichment: 'ECB', unit: 'FX Rate', refresh: 'Daily', caveats: 'Reference rate, not live', module: 'External' },
  { name: 'Fed Funds Rate', formula: 'Latest from FRED DFF series', sourceTables: '—', enrichment: 'FRED', unit: '%', refresh: 'Daily', caveats: '', module: 'External' },
  { name: 'Stock Price History', formula: 'TIME_SERIES_DAILY_ADJUSTED', sourceTables: '—', enrichment: 'Alpha Vantage, EODHD', unit: 'USD', refresh: 'Daily', caveats: '5 req/min rate limit (AV)', module: 'External' },
  { name: 'Company Filings', formula: 'XBRL company facts', sourceTables: '—', enrichment: 'SEC EDGAR', unit: 'Filing', refresh: 'On demand', caveats: 'US equities only', module: 'External' },
];

export default function AnalyticsCatalogPage() {
  const [filter, setFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);

  const modules = useMemo(() => [...new Set(METRICS.map(m => m.module))], []);
  const filtered = useMemo(() => {
    let rows = METRICS as Record<string, unknown>[];
    if (moduleFilter) rows = rows.filter(r => r.module === moduleFilter);
    if (filter) {
      const lc = filter.toLowerCase();
      rows = rows.filter(r => String(r.name).toLowerCase().includes(lc) || String(r.sourceTables).toLowerCase().includes(lc));
    }
    return rows;
  }, [filter, moduleFilter]);

  return (
    <div className="page-container">
      <div className="section-header"><h1 className="section-title">Analytics Catalog</h1></div>

      <div className="flex gap-3 mb-4 items-end">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search metrics..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-8 text-sm bg-secondary border-border" />
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setModuleFilter(null)} className={`status-badge ${!moduleFilter ? 'status-info' : 'status-neutral'} cursor-pointer`}>All</button>
          {modules.map(m => (
            <button key={m} onClick={() => setModuleFilter(m)} className={`status-badge ${moduleFilter === m ? 'status-info' : 'status-neutral'} cursor-pointer`}>{m}</button>
          ))}
        </div>
      </div>

      <div className="metric-card">
        <DataTable
          columns={[
            { key: 'name', label: 'Metric', className: 'font-sans text-foreground font-medium' },
            { key: 'formula', label: 'Formula' },
            { key: 'sourceTables', label: 'Source Tables' },
            { key: 'enrichment', label: 'Enrichment' },
            { key: 'unit', label: 'Unit' },
            { key: 'refresh', label: 'Refresh' },
            { key: 'module', label: 'Module', format: (v: unknown) => <span className="status-badge status-neutral">{String(v)}</span> },
            { key: 'caveats', label: 'Caveats' },
          ]}
          data={filtered}
          stickyHeader
          emptyMessage="No metrics match the filter"
        />
      </div>
    </div>
  );
}
