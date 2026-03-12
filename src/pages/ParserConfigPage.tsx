import { useState } from "react";
import { useParserProfiles, useUpsertParserProfile, useParseFile } from "@/hooks/use-pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TestTube, Eye, Loader2, RefreshCw } from "lucide-react";

export default function ParserConfigPage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [testContent, setTestContent] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);

  const { data: profiles, isLoading, refetch } = useParserProfiles();
  const upsert = useUpsertParserProfile();
  const parseFile = useParseFile();

  const startEdit = (id: string) => {
    const p = profiles?.find(pp => pp.id === id);
    if (p) {
      setForm({ ...p });
      setEditing(id);
      setCreating(false);
    }
  };

  const startCreate = () => {
    setForm({
      name: '', source_pattern: '*', file_type: 'CSV', delimiter: ',',
      header_row: 1, skip_rows: 0, date_format: 'YYYY-MM-DD',
      numeric_format: 'US', encoding: 'UTF-8', skip_condition: '',
      header_detection: 'auto-detect from row 1', date_parsing_rule: '',
      numeric_parsing_rule: 'strip commas, parse as float',
      validation_rules: '', dedup_key: '', version: 1,
    });
    setEditing(null);
    setCreating(true);
  };

  const handleSave = () => {
    const payload = { ...form };
    if (editing) payload.id = editing;
    // Bump version on edit
    if (editing) payload.version = ((form.version as number) || 1) + 1;
    upsert.mutate(payload, {
      onSuccess: () => { setEditing(null); setCreating(false); },
    });
  };

  const handleTestParse = () => {
    if (!testContent.trim()) return;
    const profileId = editing || (creating ? null : null);
    if (!profileId) return;
    parseFile.mutate({
      fileContent: testContent,
      profileId,
      dryRun: true,
    }, {
      onSuccess: (data) => {
        setPreviewResult(data);
        setShowPreview(true);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Parser Configuration</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
          <Button size="sm" className="text-xs" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />New Profile
          </Button>
        </div>
      </div>

      {(!profiles || profiles.length === 0) && !creating ? (
        <div className="metric-card text-center py-12">
          <p className="text-muted-foreground text-sm mb-3">No parser profiles configured yet.</p>
          <Button size="sm" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Create First Profile
          </Button>
        </div>
      ) : (
        <div className="metric-card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Source Pattern</th>
                <th>File Type</th>
                <th>Delimiter</th>
                <th>Header Row</th>
                <th>Date Format</th>
                <th>Version</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(profiles || []).map(p => (
                <tr key={p.id}>
                  <td className="font-sans text-foreground font-medium">{p.name}</td>
                  <td className="text-muted-foreground">{p.source_pattern}</td>
                  <td><span className="status-badge status-info">{p.file_type}</span></td>
                  <td>{p.delimiter === ',' ? 'comma' : p.delimiter}</td>
                  <td>{p.header_row}</td>
                  <td className="text-muted-foreground">{p.date_format}</td>
                  <td>v{p.version}</td>
                  <td className="text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startEdit(p.id)}>Edit</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <div className="config-panel mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground font-semibold">{creating ? 'New Parser Profile' : `Edit: ${form.name}`}</h2>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setCreating(false); }}>Close</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="config-label">Profile Name</label><Input value={(form.name as string) || ''} onChange={e => setForm({...form, name: e.target.value})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Source Pattern</label><Input value={(form.source_pattern as string) || ''} onChange={e => setForm({...form, source_pattern: e.target.value})} className="bg-secondary border-border" /></div>
            <div>
              <label className="config-label">File Type</label>
              <select value={(form.file_type as string) || 'CSV'} onChange={e => setForm({...form, file_type: e.target.value})} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                <option value="CSV">CSV</option>
                <option value="XML">XML</option>
                <option value="TSV">TSV</option>
                <option value="JSON">JSON</option>
              </select>
            </div>
            <div><label className="config-label">Delimiter</label><Input value={(form.delimiter as string) || ','} onChange={e => setForm({...form, delimiter: e.target.value})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Header Row</label><Input type="number" value={(form.header_row as number) || 1} onChange={e => setForm({...form, header_row: parseInt(e.target.value)})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Skip Rows</label><Input type="number" value={(form.skip_rows as number) || 0} onChange={e => setForm({...form, skip_rows: parseInt(e.target.value)})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Date Format</label><Input value={(form.date_format as string) || 'YYYY-MM-DD'} onChange={e => setForm({...form, date_format: e.target.value})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Numeric Format</label><Input value={(form.numeric_format as string) || 'US'} onChange={e => setForm({...form, numeric_format: e.target.value})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Encoding</label><Input value={(form.encoding as string) || 'UTF-8'} onChange={e => setForm({...form, encoding: e.target.value})} className="bg-secondary border-border" /></div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Advanced Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="config-label">Row Skip Condition</label><Input value={(form.skip_condition as string) || ''} onChange={e => setForm({...form, skip_condition: e.target.value})} className="bg-secondary border-border" placeholder="e.g. skip if column[0] starts with '#'" /></div>
              <div><label className="config-label">Header Detection</label><Input value={(form.header_detection as string) || ''} onChange={e => setForm({...form, header_detection: e.target.value})} className="bg-secondary border-border" /></div>
              <div><label className="config-label">Date Parsing Rule</label><Input value={(form.date_parsing_rule as string) || ''} onChange={e => setForm({...form, date_parsing_rule: e.target.value})} className="bg-secondary border-border" /></div>
              <div><label className="config-label">Numeric Parsing</label><Input value={(form.numeric_parsing_rule as string) || ''} onChange={e => setForm({...form, numeric_parsing_rule: e.target.value})} className="bg-secondary border-border" /></div>
              <div><label className="config-label">Validation Rules</label><Input value={(form.validation_rules as string) || ''} onChange={e => setForm({...form, validation_rules: e.target.value})} className="bg-secondary border-border" placeholder="required: Symbol, Quantity, Price" /></div>
              <div><label className="config-label">Dedup Key</label><Input value={(form.dedup_key as string) || ''} onChange={e => setForm({...form, dedup_key: e.target.value})} className="bg-secondary border-border" placeholder="Symbol + TradeDate + Quantity" /></div>
            </div>
          </div>

          {editing && (
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Test Parse</h3>
              <textarea
                value={testContent}
                onChange={e => setTestContent(e.target.value)}
                placeholder="Paste CSV or XML content here to test parsing..."
                className="w-full h-32 bg-secondary border border-border text-foreground text-xs font-mono rounded-md p-3 resize-y"
              />
            </div>
          )}

          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            {editing ? (
              <Button variant="outline" size="sm" className="text-xs" onClick={handleTestParse} disabled={parseFile.isPending || !testContent.trim()}>
                {parseFile.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <TestTube className="h-3 w-3 mr-1.5" />}
                Test Parse
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(null); setCreating(false); }}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
                Save Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPreview && previewResult && (
        <div className="config-panel mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="metric-label">Parse Preview — {previewResult.totalRows} rows, {previewResult.errorCount} errors</div>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>Close</Button>
          </div>
          {previewResult.parsedPreview && previewResult.parsedPreview.length > 0 && (
            <div className="bg-secondary rounded p-3 text-xs font-mono text-muted-foreground overflow-x-auto mb-3">
              <div className="text-foreground mb-2">Parsed rows (first {previewResult.parsedPreview.length}):</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    {Object.keys(previewResult.parsedPreview[0].data || {}).map((k: string) => <th key={k}>{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewResult.parsedPreview.map((row: any) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      {Object.values(row.data || {}).map((v: any, i: number) => <td key={i}>{String(v)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {previewResult.errors && previewResult.errors.length > 0 && (
            <div className="space-y-1">
              <div className="metric-label">Errors:</div>
              {previewResult.errors.map((e: any, i: number) => (
                <div key={i} className="text-xs bg-destructive/10 rounded p-2">
                  <span className="text-destructive font-medium">Row {e.row}: {e.field}</span> — {e.message}
                  {e.value && <span className="text-muted-foreground ml-2">("{e.value}")</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
