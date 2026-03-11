import { useState } from "react";
import { parserProfiles } from "@/lib/mock-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TestTube, Eye } from "lucide-react";

export default function ParserConfigPage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Parser Configuration</h1>
        <Button size="sm" className="text-xs"><Plus className="h-3.5 w-3.5 mr-1.5" />New Profile</Button>
      </div>

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
            {parserProfiles.map(p => (
              <tr key={p.id}>
                <td className="font-sans text-foreground font-medium">{p.name}</td>
                <td className="text-muted-foreground">{p.sourcePattern}</td>
                <td><span className="status-badge status-info">{p.fileType}</span></td>
                <td>{p.delimiter === ',' ? 'comma' : p.delimiter}</td>
                <td>{p.headerRow}</td>
                <td className="text-muted-foreground">{p.dateFormat}</td>
                <td>v{p.version}</td>
                <td className="text-muted-foreground">{p.updatedAt}</td>
                <td>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(p.id)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowPreview(true)}><Eye className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (() => {
        const profile = parserProfiles.find(p => p.id === editing)!;
        return (
          <div className="config-panel">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-foreground font-semibold">Edit Parser Profile: {profile.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Close</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="config-label">Profile Name</label><Input defaultValue={profile.name} className="bg-secondary border-border" /></div>
              <div><label className="config-label">Source Pattern</label><Input defaultValue={profile.sourcePattern} className="bg-secondary border-border" /></div>
              <div><label className="config-label">File Type</label><Input defaultValue={profile.fileType} className="bg-secondary border-border" /></div>
              <div><label className="config-label">Delimiter</label><Input defaultValue={profile.delimiter} className="bg-secondary border-border" /></div>
              <div><label className="config-label">Header Row</label><Input type="number" defaultValue={profile.headerRow} className="bg-secondary border-border" /></div>
              <div><label className="config-label">Skip Rows</label><Input type="number" defaultValue={profile.skipRows} className="bg-secondary border-border" /></div>
              <div><label className="config-label">Date Format</label><Input defaultValue={profile.dateFormat} className="bg-secondary border-border" /></div>
              <div><label className="config-label">Numeric Format</label><Input defaultValue={profile.numericFormat} className="bg-secondary border-border" /></div>
              <div><label className="config-label">Encoding</label><Input defaultValue={profile.encoding} className="bg-secondary border-border" /></div>
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Advanced Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="config-label">Row Skip Condition</label><Input defaultValue="skip if column[0] starts with '#'" className="bg-secondary border-border" /></div>
                <div><label className="config-label">Header Detection</label><Input defaultValue="auto-detect from row 1" className="bg-secondary border-border" /></div>
                <div><label className="config-label">Date Parsing Rule</label><Input defaultValue="parse all date columns with format" className="bg-secondary border-border" /></div>
                <div><label className="config-label">Numeric Parsing</label><Input defaultValue="strip commas, parse as float" className="bg-secondary border-border" /></div>
                <div><label className="config-label">Validation Rules</label><Input defaultValue="required: Symbol, Quantity, Price" className="bg-secondary border-border" /></div>
                <div><label className="config-label">Dedup Key</label><Input defaultValue="Symbol + TradeDate + Quantity" className="bg-secondary border-border" /></div>
              </div>
            </div>

            <div className="flex justify-between mt-4 pt-4 border-t border-border">
              <Button variant="outline" size="sm" className="text-xs"><TestTube className="h-3 w-3 mr-1.5" />Test Parse</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                <Button size="sm">Save Profile</Button>
              </div>
            </div>
          </div>
        );
      })()}

      {showPreview && (
        <div className="config-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="metric-label">Parse Preview</div>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>Close</Button>
          </div>
          <div className="bg-secondary rounded p-3 text-xs font-mono text-muted-foreground overflow-x-auto">
            <div className="text-foreground mb-2">Sample parsed output (first 5 rows):</div>
            <table className="data-table">
              <thead><tr><th>TradeDate</th><th>Symbol</th><th>Side</th><th>Quantity</th><th>Price</th><th>Commission</th></tr></thead>
              <tbody>
                <tr><td>2026-03-10</td><td>SPY 240315C500</td><td>SELL</td><td>10</td><td>8.50</td><td>12.50</td></tr>
                <tr><td>2026-03-10</td><td>SPY 240315P480</td><td>SELL</td><td>10</td><td>5.20</td><td>12.50</td></tr>
                <tr><td>2026-03-08</td><td>AAPL</td><td>BUY</td><td>500</td><td>178.50</td><td>1.00</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
