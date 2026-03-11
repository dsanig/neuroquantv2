import { useState } from "react";
import { importBatches } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Download } from "lucide-react";

export default function ImportsPage() {
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const selected = importBatches.find(b => b.id === selectedBatch);

  const totalImported = importBatches.reduce((s, b) => s + b.importedRows, 0);
  const totalErrors = importBatches.reduce((s, b) => s + b.errorRows, 0);

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Imports</h1>
        <Button variant="outline" size="sm" className="text-xs"><Download className="h-3.5 w-3.5 mr-1.5" />Fetch Now</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Batches" value={importBatches.length.toString()} />
        <MetricCard label="Rows Imported" value={totalImported.toLocaleString()} />
        <MetricCard label="Errors" value={totalErrors.toString()} changeType={totalErrors > 0 ? 'negative' : 'neutral'} />
        <MetricCard label="Success Rate" value={`${((totalImported / (totalImported + totalErrors)) * 100).toFixed(1)}%`} />
      </div>

      <div className="flex gap-4">
        <div className={`metric-card overflow-x-auto ${selectedBatch ? 'flex-1' : 'w-full'}`}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>File</th>
                <th>Parser</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Errors</th>
                <th>Started</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {importBatches.map(b => (
                <tr key={b.id} className="cursor-pointer" onClick={() => setSelectedBatch(b.id)}>
                  <td className="font-sans text-foreground">{b.sourceName}</td>
                  <td className="text-muted-foreground max-w-[200px] truncate">{b.fileName}</td>
                  <td className="text-muted-foreground">{b.parserProfile}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{b.importedRows}/{b.totalRows}</td>
                  <td className={b.errorRows > 0 ? 'text-destructive' : ''}>{b.errorRows}</td>
                  <td className="text-muted-foreground">{new Date(b.startedAt).toLocaleString()}</td>
                  <td className="text-muted-foreground">{b.triggeredBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="metric-card w-96 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="metric-label">Import Details</div>
              <button onClick={() => setSelectedBatch(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">File</span><span className="font-mono text-foreground truncate max-w-[200px]">{selected.fileName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Parser</span><span className="font-mono">{selected.parserProfile}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mapping</span><span className="font-mono">{selected.mappingVersion}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><span className="font-mono">{selected.importedRows}/{selected.totalRows}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Errors</span><span className="font-mono text-destructive">{selected.errorRows}</span></div>
            </div>
            {selected.errors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="metric-label mb-2">Errors</div>
                {selected.errors.map((e, i) => (
                  <div key={i} className="text-xs bg-destructive/10 rounded p-2 mb-1.5">
                    <div className="text-destructive font-medium">Row {e.row}: {e.field}</div>
                    <div className="text-muted-foreground">{e.message}</div>
                    {e.value && <div className="font-mono text-muted-foreground mt-0.5">Value: "{e.value}"</div>}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="text-xs flex-1"><RotateCcw className="h-3 w-3 mr-1" />Reprocess</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
