import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCapitalLedger, useInsertCapitalEvent } from "@/hooks/use-settings";
import { MetricCard } from "@/components/MetricCard";
import { Plus, Check } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";

const ACTION_TYPES = ['Initial', 'Contribution', 'Distribution', 'Fee Adjustment', 'Manual Correction', 'FX Adjustment', 'Strategy Transfer'];

function fmtCur(n: number) { return n >= 0 ? `€${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-€${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }

function EventForm({ onSave, onClose }: { onSave: (d: any) => void; onClose: () => void }) {
  const [f, setF] = useState({ event_date: new Date().toISOString().slice(0, 10), action_type: 'Contribution', amount: 0, notes: '', source: 'manual', account: '' });
  const u = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="config-label">Date *</label><Input type="date" value={f.event_date} onChange={e => u('event_date', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Action *</label>
          <Select value={f.action_type} onValueChange={v => u('action_type', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{ACTION_TYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><label className="config-label">Amount *</label><Input type="number" step="0.01" value={f.amount} onChange={e => u('amount', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Account</label><Input value={f.account} onChange={e => u('account', e.target.value)} className="bg-secondary border-border" /></div>
      </div>
      <div><label className="config-label">Notes</label><Input value={f.notes} onChange={e => u('notes', e.target.value)} className="bg-secondary border-border" /></div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => { onSave(f); onClose(); }}><Check className="h-3 w-3 mr-1" />Add Event</Button>
      </div>
    </div>
  );
}

export default function CapitalTrackerPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: ledger, isLoading } = useCapitalLedger();
  const insert = useInsertCapitalEvent();

  // Compute running balance
  const sorted = [...(ledger || [])].sort((a: any, b: any) => a.event_date.localeCompare(b.event_date));
  let runningBalance = 0;
  const withBalance = sorted.map((e: any) => {
    runningBalance += Number(e.amount);
    return { ...e, computed_balance: runningBalance };
  });
  const reversed = [...withBalance].reverse();
  const currentBase = runningBalance;
  const totalContributions = sorted.filter((e: any) => ['Initial', 'Contribution'].includes(e.action_type)).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalDistributions = sorted.filter((e: any) => e.action_type === 'Distribution').reduce((s: number, e: any) => s + Math.abs(Number(e.amount)), 0);

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Capital Tracker</h1>
        <div className="flex gap-2">
          <ExportButton data={reversed} filename="capital-ledger" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />Add Event</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Capital Event</DialogTitle></DialogHeader><EventForm onSave={d => insert.mutate(d)} onClose={() => setDialogOpen(false)} /></DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Current Capital Base" value={fmtCur(currentBase)} />
        <MetricCard label="Total Contributions" value={fmtCur(totalContributions)} />
        <MetricCard label="Total Distributions" value={fmtCur(totalDistributions)} />
        <MetricCard label="Events" value={String(sorted.length)} />
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Action</th><th className="text-right">Amount</th><th className="text-right">Balance</th><th>Account</th><th>Notes</th><th>Source</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr> :
            !reversed.length ? <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No capital events. Add an initial capital event to get started.</td></tr> :
            reversed.map((e: any) => (
              <tr key={e.id}>
                <td>{e.event_date}</td>
                <td><span className="status-badge status-neutral">{e.action_type}</span></td>
                <td className={`text-right ${Number(e.amount) >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtCur(Number(e.amount))}</td>
                <td className="text-right">{fmtCur(e.computed_balance)}</td>
                <td>{e.account || '—'}</td>
                <td className="text-foreground font-sans text-xs">{e.notes || '—'}</td>
                <td>{e.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
