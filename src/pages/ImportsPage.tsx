import { useState, useRef } from "react";
import { useImportBatches, useImportErrors, useRawRows, useNormalizedRecords, useParseFile, useParserProfiles } from "@/hooks/use-pipeline";
import { StatusBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Download, Upload, Loader2, RefreshCw, Eye } from "lucide-react";

export default function ImportsPage() {
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadContent, setUploadContent] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [viewTab, setViewTab] = useState<'errors' | 'raw' | 'normalized'>('errors');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: batches, isLoading, refetch } = useImportBatches();
  const { data: errors } = useImportErrors(selectedBatch || undefined);
  const { data: rawRows } = useRawRows(selectedBatch || undefined);
  const { data: normalizedRecords } = useNormalizedRecords(selectedBatch || undefined);
  const { data: profiles } = useParserProfiles();
  const parseFile = useParseFile();

  const selected = batches?.find(b => b.id === selectedBatch);

  const totalImported = (batches || []).reduce((s, b) => s + b.imported_rows, 0);
  const totalErrors = (batches || []).reduce((s, b) => s + b.error_rows, 0);
  const totalBatches = batches?.length || 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadContent(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = (dryRun: boolean) => {
    if (!uploadContent || !selectedProfileId) return;
    parseFile.mutate({
      fileContent: uploadContent,
      profileId: selectedProfileId,
      dryRun,
    }, {
      onSuccess: () => {
        if (!dryRun) {
          setShowUpload(false);
          setUploadContent('');
          refetch();
        }
      },
    });
  };

  const handleReprocess = () => {
    if (!selected?.raw_file_data || !selected.parser_profile_id) return;
    parseFile.mutate({
      fileContent: selected.raw_file_data,
      profileId: selected.parser_profile_id,
      sourceId: selected.source_id || undefined,
      dryRun: false,
    }, {
      onSuccess: () => refetch(),
    });
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Imports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowUpload(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Import File
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Batches" value={totalBatches.toString()} />
        <MetricCard label="Rows Imported" value={totalImported.toLocaleString()} />
        <MetricCard label="Errors" value={totalErrors.toString()} changeType={totalErrors > 0 ? 'negative' : 'neutral'} />
        <MetricCard label="Success Rate" value={totalImported + totalErrors > 0 ? `${((totalImported / (totalImported + totalErrors)) * 100).toFixed(1)}%` : 'N/A'} />
      </div>

      {showUpload && (
        <div className="config-panel">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground font-semibold">Import File</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>Close</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="config-label">Parser Profile</label>
              <select value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                <option value="">Select profile...</option>
                {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="config-label">File</label>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept=".csv,.xml,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
                <Button variant="outline" size="sm" className="text-xs" onClick={() => fileRef.current?.click()}>
                  Choose File
                </Button>
                {uploadFileName && <span className="text-xs text-muted-foreground self-center font-mono">{uploadFileName}</span>}
              </div>
            </div>
          </div>
          {uploadContent && (
            <div className="bg-secondary rounded p-3 text-xs font-mono text-muted-foreground max-h-32 overflow-auto mb-4">
              {uploadContent.substring(0, 1000)}
              {uploadContent.length > 1000 && <span className="text-primary">... ({uploadContent.length} chars total)</span>}
            </div>
          )}
          <textarea
            value={uploadContent}
            onChange={e => { setUploadContent(e.target.value); setUploadFileName('manual-paste'); }}
            placeholder="Or paste file content here directly..."
            className="w-full h-24 bg-secondary border border-border text-foreground text-xs font-mono rounded-md p-3 resize-y mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleImport(true)} disabled={!uploadContent || !selectedProfileId || parseFile.isPending}>
              {parseFile.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Eye className="h-3 w-3 mr-1.5" />}
              Dry Run
            </Button>
            <Button size="sm" onClick={() => handleImport(false)} disabled={!uploadContent || !selectedProfileId || parseFile.isPending}>
              {parseFile.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Upload className="h-3 w-3 mr-1.5" />}
              Run Import
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className={`metric-card overflow-x-auto ${selectedBatch ? 'flex-1' : 'w-full'}`}>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !batches?.length ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No import batches yet. Upload a file to start.</div>
          ) : (
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
                {batches.map(b => (
                  <tr key={b.id} className="cursor-pointer" onClick={() => setSelectedBatch(b.id)}>
                    <td className="font-sans text-foreground">{b.source_name}</td>
                    <td className="text-muted-foreground max-w-[200px] truncate">{b.file_name}</td>
                    <td className="text-muted-foreground">{b.parser_profile_name}</td>
                    <td><StatusBadge status={b.status as any} /></td>
                    <td>{b.imported_rows}/{b.total_rows}</td>
                    <td className={b.error_rows > 0 ? 'text-destructive' : ''}>{b.error_rows}</td>
                    <td className="text-muted-foreground">{new Date(b.started_at).toLocaleString()}</td>
                    <td className="text-muted-foreground">{b.triggered_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="metric-card w-[450px] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="metric-label">Import Details</div>
              <button onClick={() => setSelectedBatch(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">File</span><span className="font-mono text-foreground truncate max-w-[250px]">{selected.file_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={selected.status as any} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Parser</span><span className="font-mono">{selected.parser_profile_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mapping</span><span className="font-mono">{selected.mapping_version}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><span className="font-mono">{selected.imported_rows}/{selected.total_rows}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Errors</span><span className="font-mono text-destructive">{selected.error_rows}</span></div>
            </div>

            <div className="flex gap-1 mt-3 border-t border-border pt-3">
              {(['errors', 'raw', 'normalized'] as const).map(tab => (
                <button key={tab} onClick={() => setViewTab(tab)} className={`status-badge cursor-pointer ${viewTab === tab ? 'status-info' : 'status-neutral'}`}>
                  {tab === 'errors' ? `Errors (${errors?.length || 0})` : tab === 'raw' ? `Raw (${rawRows?.length || 0})` : `Mapped (${normalizedRecords?.length || 0})`}
                </button>
              ))}
            </div>

            {viewTab === 'errors' && errors && errors.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-60 overflow-auto">
                {errors.map((e) => (
                  <div key={e.id} className="text-xs bg-destructive/10 rounded p-2">
                    <div className="text-destructive font-medium">Row {e.row_number}: {e.field}</div>
                    <div className="text-muted-foreground">{e.message}</div>
                    {e.value && <div className="font-mono text-muted-foreground mt-0.5">Value: "{e.value}"</div>}
                  </div>
                ))}
              </div>
            )}

            {viewTab === 'raw' && rawRows && rawRows.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-60 overflow-auto">
                {rawRows.map((r) => (
                  <div key={r.id} className="text-xs bg-secondary rounded p-2 font-mono">
                    <span className="text-primary">Row {r.row_number}:</span> {JSON.stringify(r.raw_data).substring(0, 200)}
                  </div>
                ))}
              </div>
            )}

            {viewTab === 'normalized' && normalizedRecords && normalizedRecords.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-60 overflow-auto">
                {normalizedRecords.map((r) => (
                  <div key={r.id} className="text-xs bg-secondary rounded p-2 font-mono">
                    <span className="text-primary">{r.destination_table}:</span>{' '}
                    <span className={r.validation_status === 'valid' ? '' : 'text-destructive'}>[{r.validation_status}]</span>{' '}
                    {JSON.stringify(r.mapped_data).substring(0, 200)}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="text-xs flex-1" onClick={handleReprocess} disabled={parseFile.isPending || !selected.raw_file_data}>
                {parseFile.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                Reprocess
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
