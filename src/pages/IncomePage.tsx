import { MetricCard } from "@/components/MetricCard";
import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { ExportButton } from "@/components/ExportButton";
import { useExternalQuery, useCashReport, useProjectedIncome, useStatementOfFunds } from "@/hooks/use-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function num(v: unknown): number { const n = Number(v); return isNaN(n) ? 0 : n; }
function fmtC(v: unknown): string { const n = num(v); return n >= 0 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }

export default function IncomePage() {
  const dividends = useExternalQuery(['income-dividends'], `SELECT * FROM open_dividend_accruals ORDER BY 1 LIMIT 200`);
  const interest = useExternalQuery(['income-interest'], `SELECT * FROM interest_details ORDER BY 1 LIMIT 200`);
  const cashRpt = useCashReport();
  const projected = useProjectedIncome();
  const sof = useStatementOfFunds();

  const divRows = (dividends.data || []) as Record<string, unknown>[];
  const intRows = (interest.data || []) as Record<string, unknown>[];
  const cashRows = (cashRpt.data || []) as Record<string, unknown>[];

  const isLoading = dividends.isLoading && interest.isLoading && cashRpt.isLoading;
  const anyError = dividends.isError && interest.isError && cashRpt.isError;

  if (isLoading || (anyError && !divRows.length && !intRows.length)) {
    return (
      <div className="page-container">
        <div className="section-header"><h1 className="section-title">Income</h1></div>
        <DataStatusBanner isLoading={isLoading} isError={anyError} error={dividends.error as Error} isEmpty={false} moduleName="Income" requiredTables={['open_dividend_accruals', 'interest_details', 'cash_report']} />
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
        <h1 className="section-title">Income & Cash</h1>
        <ExportButton data={[...divRows, ...intRows]} filename="income" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Dividend Accruals" value={String(divRows.length)} />
        <MetricCard label="Interest Items" value={String(intRows.length)} />
        <MetricCard label="Cash Currencies" value={String(cashRows.length)} />
        <MetricCard label="Projected Income Items" value={String(((projected.data || []) as unknown[]).length)} />
      </div>

      <Tabs defaultValue="dividends">
        <TabsList>
          <TabsTrigger value="dividends">Dividends</TabsTrigger>
          <TabsTrigger value="interest">Interest</TabsTrigger>
          <TabsTrigger value="cash">Cash Report</TabsTrigger>
          <TabsTrigger value="projected">Projected Income</TabsTrigger>
          <TabsTrigger value="sof">Statement of Funds</TabsTrigger>
        </TabsList>
        {[
          { key: 'dividends', q: dividends },
          { key: 'interest', q: interest },
          { key: 'cash', q: cashRpt },
          { key: 'projected', q: projected },
          { key: 'sof', q: sof },
        ].map(({ key, q }) => (
          <TabsContent key={key} value={key}>
            <div className="metric-card">
              {q.isLoading ? (
                <DataStatusBanner isLoading moduleName={key} isError={false} />
              ) : q.isError ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Table not available for {key}</div>
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
