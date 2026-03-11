import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

const reports = [
  { id: 'r1', name: 'Daily P&L Summary', date: '2026-03-10', type: 'PDF', status: 'ready' },
  { id: 'r2', name: 'Position Snapshot', date: '2026-03-10', type: 'CSV', status: 'ready' },
  { id: 'r3', name: 'Monthly Performance Report', date: '2026-02-28', type: 'PDF', status: 'ready' },
  { id: 'r4', name: 'Import Diagnostics Report', date: '2026-03-10', type: 'JSON', status: 'ready' },
  { id: 'r5', name: 'Risk Exposure Summary', date: '2026-03-10', type: 'PDF', status: 'generating' },
  { id: 'r6', name: 'Margin Utilization Report', date: '2026-03-10', type: 'CSV', status: 'ready' },
];

export default function ReportsPage() {
  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Reports</h1>
        <Button size="sm" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1.5" />Generate Report</Button>
      </div>
      <div className="metric-card">
        <table className="data-table">
          <thead>
            <tr><th>Report</th><th>Date</th><th>Format</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id}>
                <td className="font-sans text-foreground font-medium">{r.name}</td>
                <td>{r.date}</td>
                <td><span className="status-badge status-neutral">{r.type}</span></td>
                <td><span className={`status-badge ${r.status === 'ready' ? 'status-success' : 'status-info'}`}>{r.status}</span></td>
                <td><Button variant="ghost" size="sm" className="h-7 text-xs" disabled={r.status !== 'ready'}><Download className="h-3 w-3 mr-1" />Download</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
