import { DataStatusBanner } from "@/components/DataStatusBanner";
import { DataTable } from "@/components/DataTable";
import { MetricCard } from "@/components/MetricCard";
import { useExternalQuery, getActiveConnectionId } from "@/hooks/use-analytics";
import { useDatabaseConnections, useImportBatches, useParserProfiles } from "@/hooks/use-pipeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface QualityCheck {
  rule: string;
  severity: 'critical' | 'warning' | 'info';
  module: string;
  count: number;
  message: string;
}

export default function DataQualityPage() {
  const connId = getActiveConnectionId();
  const { data: connections } = useDatabaseConnections();
  const { data: batches } = useImportBatches();
  const { data: profiles } = useParserProfiles();

  // Run quality checks against the external DB
  const nullChecks = useExternalQuery(['dq-nulls'], `
    SELECT 'open_positions_data' as tbl, 'symbol' as field, count(*) as null_count 
    FROM open_positions_data WHERE symbol IS NULL OR symbol = ''
    UNION ALL
    SELECT 'trnt', 'trade_date', count(*) FROM trnt WHERE trade_date IS NULL
    UNION ALL
    SELECT 'trnt', 'symbol', count(*) FROM trnt WHERE symbol IS NULL OR symbol = ''
    UNION ALL
    SELECT 'trnt', 'trade_price', count(*) FROM trnt WHERE trade_price IS NULL
  `);

  const dupChecks = useExternalQuery(['dq-duplicates'], `
    SELECT symbol, trade_date, trade_price, quantity, count(*) as dup_count
    FROM trnt
    GROUP BY symbol, trade_date, trade_price, quantity
    HAVING count(*) > 1
    LIMIT 20
  `);

  const nullRows = (nullChecks.data || []) as Record<string, unknown>[];
  const dupRows = (dupChecks.data || []) as Record<string, unknown>[];

  // Build quality issues
  const issues: QualityCheck[] = [];

  // Connection health
  const activeConn = (connections || []).find(c => c.id === connId);
  if (!connId) {
    issues.push({ rule: 'No data connection', severity: 'critical', module: 'System', count: 1, message: 'No external PostgreSQL connection configured' });
  } else if (activeConn?.last_status === 'error') {
    issues.push({ rule: 'Connection error', severity: 'critical', module: 'System', count: 1, message: `Connection failed: ${activeConn.last_error}` });
  }

  // Null checks
  nullRows.forEach(r => {
    const cnt = Number(r.null_count || 0);
    if (cnt > 0) {
      issues.push({ rule: `Null/empty ${r.field}`, severity: 'warning', module: String(r.tbl), count: cnt, message: `${cnt} rows with null/empty ${r.field} in ${r.tbl}` });
    }
  });

  // Duplicate checks
  if (dupRows.length > 0) {
    issues.push({ rule: 'Duplicate trades', severity: 'warning', module: 'trnt', count: dupRows.length, message: `${dupRows.length} potential duplicate trade groups found` });
  }

  // Import health
  const recentBatches = (batches || []).slice(0, 5);
  const failedBatches = recentBatches.filter(b => b.status === 'failed');
  if (failedBatches.length > 0) {
    issues.push({ rule: 'Failed imports', severity: 'warning', module: 'Imports', count: failedBatches.length, message: `${failedBatches.length} recent import batches failed` });
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const healthScore = Math.max(0, 100 - criticalCount * 30 - warningCount * 10);

  const severityIcon = (s: string) => {
    if (s === 'critical') return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    if (s === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
    return <CheckCircle className="h-3.5 w-3.5 text-success" />;
  };

  return (
    <div className="page-container">
      <div className="section-header"><h1 className="section-title">Data Quality</h1></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Health Score" value={`${healthScore}%`} changeType={healthScore >= 80 ? 'positive' : healthScore >= 50 ? 'neutral' : 'negative'} />
        <MetricCard label="Critical Issues" value={String(criticalCount)} changeType={criticalCount > 0 ? 'negative' : 'positive'} />
        <MetricCard label="Warnings" value={String(warningCount)} changeType={warningCount > 0 ? 'negative' : 'positive'} />
        <MetricCard label="Checks Run" value={String(issues.length + (nullRows.length ? 1 : 0))} />
      </div>

      <div className="metric-card">
        <div className="metric-label mb-3">Quality Issues</div>
        {issues.length === 0 ? (
          <div className="flex items-center gap-2 py-4 justify-center text-sm text-success">
            <CheckCircle className="h-4 w-4" /> All checks passed
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50">
                {severityIcon(issue.severity)}
                <div className="flex-1">
                  <div className="text-sm text-foreground font-medium">{issue.rule}</div>
                  <div className="text-xs text-muted-foreground">{issue.message}</div>
                </div>
                <div className="text-right">
                  <span className={`status-badge ${issue.severity === 'critical' ? 'status-error' : 'status-warning'}`}>{issue.severity}</span>
                  <div className="text-xs text-muted-foreground mt-1">{issue.module}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dupRows.length > 0 && (
        <div className="metric-card">
          <div className="metric-label mb-3">Potential Duplicates</div>
          <DataTable
            columns={Object.keys(dupRows[0]).map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))}
            data={dupRows}
            stickyHeader
          />
        </div>
      )}
    </div>
  );
}
