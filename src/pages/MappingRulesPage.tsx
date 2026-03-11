import { useState } from "react";
import { mappingRules, parserProfiles } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Eye } from "lucide-react";

export default function MappingRulesPage() {
  const [selectedProfile, setSelectedProfile] = useState("pp1");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const filtered = mappingRules.filter(r => r.profileId === selectedProfile && (!selectedTable || r.destinationTable === selectedTable));
  const tables = [...new Set(mappingRules.filter(r => r.profileId === selectedProfile).map(r => r.destinationTable))];

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Mapping Rules</h1>
        <Button size="sm" className="text-xs"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Rule</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div>
          <label className="config-label">Parser Profile</label>
          <select value={selectedProfile} onChange={e => { setSelectedProfile(e.target.value); setSelectedTable(null); }} className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-1.5">
            {parserProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="config-label">Destination Table</label>
          <div className="flex gap-1.5">
            <button onClick={() => setSelectedTable(null)} className={`status-badge ${!selectedTable ? 'status-info' : 'status-neutral'} cursor-pointer`}>All</button>
            {tables.map(t => (
              <button key={t} onClick={() => setSelectedTable(t)} className={`status-badge ${selectedTable === t ? 'status-info' : 'status-neutral'} cursor-pointer`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

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
                <td className="text-foreground font-sans font-medium">{r.sourceField}</td>
                <td className="text-muted-foreground">→</td>
                <td className="text-primary">{r.targetField}</td>
                <td><span className="status-badge status-neutral">{r.destinationTable}</span></td>
                <td className="text-muted-foreground">{r.fieldType}</td>
                <td>{r.required ? <span className="status-badge status-warning">Required</span> : <span className="text-muted-foreground">—</span>}</td>
                <td className="text-muted-foreground">{r.transform || '—'}</td>
                <td className="text-muted-foreground">{r.defaultValue || '—'}</td>
                <td><span className="status-badge status-neutral">{r.dedup}</span></td>
                <td><Button variant="ghost" size="sm" className="h-7 text-xs">Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="config-panel mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="metric-label">Mapping Test Preview</div>
          <Button variant="outline" size="sm" className="text-xs"><Eye className="h-3 w-3 mr-1.5" />Preview Mapping</Button>
        </div>
        <div className="bg-secondary rounded p-3 text-xs font-mono text-muted-foreground">
          <p>Select "Preview Mapping" to test how source data maps to destination tables using current rules.</p>
          <p className="mt-1">Supports: validation preview, type coercion check, deduplication simulation.</p>
        </div>
      </div>
    </div>
  );
}
