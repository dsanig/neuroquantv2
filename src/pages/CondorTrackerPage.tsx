import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCondorTrades, useUpsertCondorTrade, useAppSettings } from "@/hooks/use-settings";
import { calcCondorCapitalAtRisk, calcCondorMaxProfit, calcCondorBreakevens, calcDaysInTrade, calcDaysToExpiry, calcFees, calcTradeROC, calcAnnualizedROC, calcEstimatedTax, calcPostTaxPL } from "@/lib/calculations";
import { Plus, Check, Search } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";

const STATUSES = ['all', 'Open', 'BTC (Profit)', 'BTC (Loss)', 'Expired', 'Rolled', 'Assigned'];

function getSettingNum(settings: any[], key: string, fb: number): number {
  const r = settings?.find((s: any) => s.key === key);
  if (!r) return fb;
  try { return Number(JSON.parse(String(r.value))); } catch { return fb; }
}
function fmtCur(n: number) { return n >= 0 ? `€${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-€${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }
function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%`; }

function CondorForm({ trade, onSave, onClose }: { trade?: any; onSave: (d: any) => void; onClose: () => void }) {
  const [f, setF] = useState({
    trade_date: trade?.trade_date || new Date().toISOString().slice(0, 10),
    underlying: trade?.underlying || '',
    contracts: trade?.contracts || 1,
    expiration_date: trade?.expiration_date || '',
    short_call_strike: trade?.short_call_strike || 0,
    long_call_strike: trade?.long_call_strike || 0,
    short_put_strike: trade?.short_put_strike || 0,
    long_put_strike: trade?.long_put_strike || 0,
    premium_per_share: trade?.premium_per_share || 0,
    status: trade?.status || 'Open',
    close_date: trade?.close_date || '',
    premium_paid_to_close: trade?.premium_paid_to_close || 0,
    currency: trade?.currency || 'EUR',
    multiplier: trade?.multiplier || 100,
    exchange_mic: trade?.exchange_mic || '',
    notes: trade?.notes || '',
  });
  const u = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div><label className="config-label">Trade Date *</label><Input type="date" value={f.trade_date} onChange={e => u('trade_date', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Underlying *</label><Input value={f.underlying} onChange={e => u('underlying', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Contracts</label><Input type="number" value={f.contracts} onChange={e => u('contracts', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Expiration *</label><Input type="date" value={f.expiration_date} onChange={e => u('expiration_date', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Short Put Strike *</label><Input type="number" step="0.01" value={f.short_put_strike} onChange={e => u('short_put_strike', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Long Put Strike *</label><Input type="number" step="0.01" value={f.long_put_strike} onChange={e => u('long_put_strike', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Short Call Strike *</label><Input type="number" step="0.01" value={f.short_call_strike} onChange={e => u('short_call_strike', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Long Call Strike *</label><Input type="number" step="0.01" value={f.long_call_strike} onChange={e => u('long_call_strike', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Net Premium/Share *</label><Input type="number" step="0.01" value={f.premium_per_share} onChange={e => u('premium_per_share', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Status</label>
          <Select value={f.status} onValueChange={v => u('status', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.filter(s => s !== 'all').map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><label className="config-label">Close Date</label><Input type="date" value={f.close_date} onChange={e => u('close_date', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Prem Paid to Close</label><Input type="number" step="0.01" value={f.premium_paid_to_close} onChange={e => u('premium_paid_to_close', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Currency</label><Input value={f.currency} onChange={e => u('currency', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Multiplier</label><Input type="number" value={f.multiplier} onChange={e => u('multiplier', Number(e.target.value))} className="bg-secondary border-border" /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => { const p: any = { ...f, close_date: f.close_date || null }; if (trade?.id) p.id = trade.id; onSave(p); onClose(); }}><Check className="h-3 w-3 mr-1" />Save</Button>
      </div>
    </div>
  );
}

export default function CondorTrackerPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<any>(null);
  const { data: trades, isLoading } = useCondorTrades({ status: statusFilter });
  const { data: settings } = useAppSettings();
  const upsert = useUpsertCondorTrade();

  const feePerContract = getSettingNum(settings || [], 'fee_per_contract', 1.25);
  const taxRate = getSettingNum(settings || [], 'estimated_tax_rate', 0.25);

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Iron Condor Tracker</h1>
        <div className="flex gap-2">
          <ExportButton data={trades || []} filename="condor-trades" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm" onClick={() => setEditTrade(null)}><Plus className="h-3 w-3 mr-1" />Add Condor</Button></DialogTrigger>
            <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{editTrade ? 'Edit' : 'New'} Iron Condor</DialogTitle></DialogHeader>
              <CondorForm trade={editTrade} onSave={d => upsert.mutate(d)} onClose={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All' : s}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{trades?.length ?? 0} condors</span>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Underlying</th><th>K</th><th>Exp</th><th>SP</th><th>LP</th><th>SC</th><th>LC</th><th>Prem</th><th>Status</th>
            <th className="text-right">DIT</th><th className="text-right">Max Risk</th><th className="text-right">Max Profit</th><th className="text-right">Net P/L</th><th className="text-right">ROC</th><th></th>
          </tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={16} className="text-center py-8 text-muted-foreground">Loading...</td></tr> :
            !trades?.length ? <tr><td colSpan={16} className="text-center py-8 text-muted-foreground">No iron condor trades yet.</td></tr> :
            trades.map((t: any) => {
              const car = calcCondorCapitalAtRisk(t);
              const maxProfit = calcCondorMaxProfit(t);
              const totalPrem = (t.premium_per_share - (t.premium_paid_to_close || 0)) * t.contracts * t.multiplier;
              const fees = calcFees(t.contracts, feePerContract, 4);
              const netPL = totalPrem - fees;
              const roc = calcTradeROC(netPL, car);
              const dit = calcDaysInTrade(t);
              const be = calcCondorBreakevens(t);

              return (
                <tr key={t.id} className="cursor-pointer" onClick={() => { setEditTrade(t); setDialogOpen(true); }}>
                  <td>{t.trade_date}</td>
                  <td className="text-foreground font-sans font-medium">{t.underlying}</td>
                  <td>{t.contracts}</td>
                  <td>{t.expiration_date}</td>
                  <td>{t.short_put_strike}</td><td>{t.long_put_strike}</td><td>{t.short_call_strike}</td><td>{t.long_call_strike}</td>
                  <td>{t.premium_per_share}</td>
                  <td><span className={`status-badge ${t.status === 'Open' ? 'status-info' : netPL >= 0 ? 'status-success' : 'status-error'}`}>{t.status}</span></td>
                  <td className="text-right">{dit}</td>
                  <td className="text-right">{fmtCur(car)}</td>
                  <td className="text-right">{fmtCur(maxProfit)}</td>
                  <td className={`text-right ${netPL >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtCur(netPL)}</td>
                  <td className="text-right">{fmtPct(roc)}</td>
                  <td></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
