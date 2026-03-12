import { useState } from "react";
import { useMappingRules, useUpsertMappingRule, useDeleteMappingRule, useParserProfiles, useParseFile } from "@/hooks/use-pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Loader2, Trash2, RefreshCw } from "lucide-react";

export default function MappingRulesPage() {
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [testContent, setTestContent] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);

  const { data: profiles } = useParserProfiles();
  const activeProfileId = selectedProfile || profiles?.[0]?.id || '';
  const { data: rules, isLoading, refetch } = useMappingRules(activeProfileId || undefined);
  const upsert = useUpsertMappingRule();
  const deleteRule = useDeleteMappingRule();
  const parseFile = useParseFile();

  const filtered = (rules || []).filter(r => !selectedTable || r.destination_table === selectedTable);
  const tables = [...new Set((rules || []).map(r => r.destination_table))];

  const startCreate = () => {
    setForm({
      profile_id: activeProfileId,
      destination_table: '', source_field: '', target_field: '',
      field_type: 'string', required: false, default_value: '',
      transform: '', validation: '', dedup_behavior: 'skip', sort_order: (rules?.length || 0),
    });
    setEditingRule(null);
    setCreating(true);
  };

  const startEdit = (id: string) => {
    const r = rules?.find(rule => rule.id === id);
    if (r) {
      setForm({ ...r });
      setEditingRule(id);
      setCreating(false);
    }
  };

  const handleSave = () => {
    const payload = { ...form };
    if (editingRule) payload.id = editingRule;
    // Remove the joined parser_profiles field
    delete payload.parser_profiles;
    upsert.mutate(payload, {
      onSuccess: () => { setEditingRule(null); setCreating(false); },
    });
  };

  const handleTestMapping = () => {
    if (!testContent.trim() || !activeProfileId) return;
    parseFile.mutate({
      fileContent: testContent,
      profileId: activeProfileId,
      dryRun: true,
    }, {
      onSuccess: (data) => setPreviewResult(data),
    });
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Mapping Rules</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
          <Button size="sm" className="text-xs" onClick={startCreate} disabled={!activeProfileId}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Rule
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div>
          <label className="config-label">Parser Profile</label>
          <select
            value={activeProfileId}
            onChange={e => { setSelectedProfile(e.target.value); setSelectedTable(null); }}
            className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-1.5"
          >
            {!profiles?.length && <option value="">No profiles</option>}
            {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {tables.length > 0 && (
          <div>
            <label className="config-label">Destination Table</label>
            <div className="flex gap-1.5">
              <button onClick={() => setSelectedTable(null)} className={`status-badge ${!selectedTable ? 'status-info' : 'status-neutral'} cursor-pointer`}>All</button>
              {tables.map(t => (
                <button key={t} onClick={() => setSelectedTable(t)} className={`status-badge ${selectedTable === t ? 'status-info' : 'status-neutral'} cursor-pointer`}>{t}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 && !creating ? (
        <div className="metric-card text-center py-12">
          <p className="text-muted-foreground text-sm mb-3">
            {!activeProfileId ? 'Create a parser profile first.' : 'No mapping rules for this profile yet.'}
          </p>
          {activeProfileId && (
            <Button size="sm" onClick={startCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Add First Rule
            </Button>
          )}
        </div>
      ) : (
        <div className="metric-card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Source Field</th>
                <th>→</th>
                <th>Target Field</th>
                <th>Table</th>
                <th>Type</th>
                <th>Required</th>
                <th>Transform</th>
                <th>Default</th>
                <th>Dedup</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="text-foreground font-sans font-medium">{r.source_field}</td>
                  <td className="text-muted-foreground">→</td>
                  <td className="text-primary">{r.target_field}</td>
                  <td><span className="status-badge status-neutral">{r.destination_table}</span></td>
                  <td className="text-muted-foreground">{r.field_type}</td>
                  <td>{r.required ? <span className="status-badge status-warning">Required</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="text-muted-foreground">{r.transform || '—'}</td>
                  <td className="text-muted-foreground">{r.default_value || '—'}</td>
                  <td><span className="status-badge status-neutral">{r.dedup_behavior}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startEdit(r.id)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteRule.mutate(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(editingRule || creating) && (
        <div className="config-panel mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground font-semibold">{creating ? 'New Mapping Rule' : 'Edit Rule'}</h2>
            <Button variant="ghost" size="sm" onClick={() => { setEditingRule(null); setCreating(false); }}>Close</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="config-label">Source Field</label><Input value={(form.source_field as string) || ''} onChange={e => setForm({...form, source_field: e.target.value})} className="bg-secondary border-border" placeholder="e.g. TradeDate" /></div>
            <div><label className="config-label">Target Field</label><Input value={(form.target_field as string) || ''} onChange={e => setForm({...form, target_field: e.target.value})} className="bg-secondary border-border" placeholder="e.g. trade_date" /></div>
            <div><label className="config-label">Destination Table</label><Input value={(form.destination_table as string) || ''} onChange={e => setForm({...form, destination_table: e.target.value})} className="bg-secondary border-border" placeholder="e.g. trades" /></div>
            <div>
              <label className="config-label">Field Type</label>
              <select value={(form.field_type as string) || 'string'} onChange={e => setForm({...form, field_type: e.target.value})} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                <option value="string">string</option>
                <option value="integer">integer</option>
                <option value="decimal">decimal</option>
                <option value="date">date</option>
                <option value="boolean">boolean</option>
              </select>
            </div>
            <div>
              <label className="config-label">Required</label>
              <select value={form.required ? 'true' : 'false'} onChange={e => setForm({...form, required: e.target.value === 'true'})} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div><label className="config-label">Default Value</label><Input value={(form.default_value as string) || ''} onChange={e => setForm({...form, default_value: e.target.value})} className="bg-secondary border-border" /></div>
            <div><label className="config-label">Transform</label><Input value={(form.transform as string) || ''} onChange={e => setForm({...form, transform: e.target.value})} className="bg-secondary border-border" placeholder="e.g. parseDate(YYYY-MM-DD)" /></div>
            <div><label className="config-label">Validation</label><Input value={(form.validation as string) || ''} onChange={e => setForm({...form, validation: e.target.value})} className="bg-secondary border-border" /></div>
            <div>
              <label className="config-label">Dedup Behavior</label>
              <select value={(form.dedup_behavior as string) || 'skip'} onChange={e => setForm({...form, dedup_behavior: e.target.value})} className="w-full bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2">
                <option value="skip">Skip</option>
                <option value="overwrite">Overwrite</option>
                <option value="append">Append</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => { setEditingRule(null); setCreating(false); }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
              Save Rule
            </Button>
          </div>
        </div>
      )}

      <div className="config-panel mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="metric-label">Mapping Test Preview</div>
          <Button variant="outline" size="sm" className="text-xs" onClick={handleTestMapping} disabled={parseFile.isPending || !testContent.trim() || !activeProfileId}>
            {parseFile.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Eye className="h-3 w-3 mr-1.5" />}
            Preview Mapping
          </Button>
        </div>
        <textarea
          value={testContent}
          onChange={e => setTestContent(e.target.value)}
          placeholder="Paste CSV/XML content here to test how it maps to destination tables..."
          className="w-full h-24 bg-secondary border border-border text-foreground text-xs font-mono rounded-md p-3 resize-y mb-3"
        />
        {previewResult && (
          <div className="bg-secondary rounded p-3 text-xs font-mono text-muted-foreground overflow-x-auto">
            <div className="text-foreground mb-2">
              Result: {previewResult.totalRows} rows → {previewResult.tablesTargeted?.join(', ') || 'none'} | Errors: {previewResult.errorCount}
            </div>
            {previewResult.normalizedPreview?.slice(0, 5).map((r: any, i: number) => (
              <div key={i} className="border-b border-border/30 py-1">
                <span className="text-primary">{r.destination_table}</span>: {JSON.stringify(r.mapped_data)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
