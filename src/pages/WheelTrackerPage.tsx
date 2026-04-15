import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWheelTrades, useUpsertWheelTrade, useSectors, useWheelCampaigns } from "@/hooks/use-settings";
import { useAppSettings } from "@/hooks/use-settings";
import { calcDaysInTrade, calcDaysToExpiry, calcCapitalAtRisk, calcTotalPremium, calcFees, calcNetCredit, calcNetPL, calcTradeROC, calcAnnualizedROC, calcEstimatedTax, calcPostTaxPL } from "@/lib/calculations";
import { Search, Plus, Check, Download } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";

const STATUSES = ['all', 'Open', 'Expired', 'Assigned', 'Called Away', 'BTC', 'BTC (Roll)'];

function getSettingNum(settings: any[], key: string, fallback: number): number {
  const row = settings?.find((s: any) => s.key === key);
  if (!row) return fallback;
  try { return Number(JSON.parse(String(row.value))); } catch { return fallback; }
}

function TradeForm({ trade, sectors, campaigns, onSave, onClose }: { trade?: any; sectors: any[]; campaigns: any[]; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    trade_date: trade?.trade_date || new Date().toISOString().slice(0, 10),
    underlying: trade?.underlying || '',
    isin: trade?.isin || '',
    trade_type: trade?.trade_type || 'CSP',
    sector_id: trade?.sector_id || '',
    contracts: trade?.contracts || 1,
    strike: trade?.strike || 0,
    expiration_date: trade?.expiration_date || '',
    delta_at_entry: trade?.delta_at_entry ?? '',
    premium_per_share: trade?.premium_per_share || 0,
    status: trade?.status || 'Open',
    close_date: trade?.close_date || '',
    premium_paid_to_close: trade?.premium_paid_to_close || 0,
    exchange_mic: trade?.exchange_mic || '',
    currency: trade?.currency || 'EUR',
    multiplier: trade?.multiplier || 100,
    broker_trade_id: trade?.broker_trade_id || '',
    account: trade?.account || '',
    campaign_id: trade?.campaign_id || '',
    stock_cost_basis: trade?.stock_cost_basis ?? '',
    notes: trade?.notes || '',
  });
  const u = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div><label className="config-label">Trade Date *</label><Input type="date" value={form.trade_date} onChange={e => u('trade_date', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Underlying *</label><Input value={form.underlying} onChange={e => u('underlying', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">ISIN</label><Input value={form.isin} onChange={e => u('isin', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Type *</label>
          <Select value={form.trade_type} onValueChange={v => u('trade_type', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="CSP">CSP</SelectItem><SelectItem value="CC">CC</SelectItem></SelectContent>
          </Select>
        </div>
        <div><label className="config-label">Contracts *</label><Input type="number" value={form.contracts} onChange={e => u('contracts', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Strike *</label><Input type="number" step="0.01" value={form.strike} onChange={e => u('strike', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Expiration *</label><Input type="date" value={form.expiration_date} onChange={e => u('expiration_date', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Delta at Entry</label><Input type="number" step="0.01" value={form.delta_at_entry} onChange={e => u('delta_at_entry', e.target.value ? Number(e.target.value) : null)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Premium/Share *</label><Input type="number" step="0.01" value={form.premium_per_share} onChange={e => u('premium_per_share', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Status</label>
          <Select value={form.status} onValueChange={v => u('status', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.filter(s => s !== 'all').map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><label className="config-label">Close Date</label><Input type="date" value={form.close_date} onChange={e => u('close_date', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Premium Paid to Close</label><Input type="number" step="0.01" value={form.premium_paid_to_close} onChange={e => u('premium_paid_to_close', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Currency</label><Input value={form.currency} onChange={e => u('currency', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Exchange MIC</label><Input value={form.exchange_mic} onChange={e => u('exchange_mic', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Multiplier</label><Input type="number" value={form.multiplier} onChange={e => u('multiplier', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Broker Trade ID</label><Input value={form.broker_trade_id} onChange={e => u('broker_trade_id', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Account</label><Input value={form.account} onChange={e => u('account', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Stock Cost Basis</label><Input type="number" step="0.01" value={form.stock_cost_basis} onChange={e => u('stock_cost_basis', e.target.value ? Number(e.target.value) : null)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Campaign</label>
          <Select value={form.campaign_id || 'none'} onValueChange={v => u('campaign_id', v === 'none' ? null : v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No campaign</SelectItem>
              {campaigns.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.underlying} — {c.status}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><label className="config-label">Sector</label>
          <Select value={form.sector_id || 'none'} onValueChange={v => u('sector_id', v === 'none' ? null : v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{sectors.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><label className="config-label">Notes</label><Input value={form.notes || ''} onChange={e => u('notes', e.target.value)} className="bg-secondary border-border" /></div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => {
          const payload = { ...form, delta_at_entry: form.delta_at_entry === '' ? null : form.delta_at_entry, stock_cost_basis: form.stock_cost_basis === '' ? null : form.stock_cost_basis, campaign_id: form.campaign_id || null, sector_id: form.sector_id || null, close_date: form.close_date || null };
          if (trade?.id) (payload as any).id = trade.id;
          onSave(payload);
          onClose();
        }}><Check className="h-3 w-3 mr-1" />Save Trade</Button>
      </div>
    </div>
  );
}

function fmtCur(n: number, ccy = 'EUR') { return n >= 0 ? `${ccy === 'EUR' ? '€' : '$'}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-${ccy === 'EUR' ? '€' : '$'}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }
function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%`; }

export default function WheelTrackerPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<any>(null);
  const { data: trades, isLoading } = useWheelTrades({ status: statusFilter, underlying: searchFilter || undefined });
  const { data: settings } = useAppSettings();
  const { data: sectors } = useSectors();
  const { data: campaigns } = useWheelCampaigns();
  const upsert = useUpsertWheelTrade();

  const feePerContract = getSettingNum(settings || [], 'fee_per_contract', 1.25);
  const taxRate = getSettingNum(settings || [], 'estimated_tax_rate', 0.25);

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Wheel Tracker</h1>
        <div className="flex gap-2">
          <ExportButton data={trades || []} filename="wheel-trades" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditTrade(null)}><Plus className="h-3 w-3 mr-1" />Add Trade</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>{editTrade ? 'Edit Trade' : 'New Wheel Trade'}</DialogTitle></DialogHeader>
              <TradeForm trade={editTrade} sectors={sectors || []} campaigns={campaigns || []} onSave={d => upsert.mutate(d)} onClose={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Filter underlying..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="pl-8 h-8 text-sm bg-secondary border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{trades?.length ?? 0} trades</span>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th><th>Underlying</th><th>Type</th><th>K</th><th>Strike</th><th>Exp</th><th>Δ</th><th>Prem</th><th>Status</th>
              <th className="text-right">DIT</th><th className="text-right">DTE</th><th className="text-right">Capital</th><th className="text-right">Net P/L</th>
              <th className="text-right">ROC</th><th className="text-right">Ann ROC</th><th className="text-right">Post-Tax</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={17} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : !trades?.length ? (
              <tr><td colSpan={17} className="text-center py-8 text-muted-foreground">No trades. Add your first wheel trade to begin tracking.</td></tr>
            ) : trades.map((t: any) => {
              const dit = calcDaysInTrade(t);
              const dte = calcDaysToExpiry(t.expiration_date);
              const car = calcCapitalAtRisk(t);
              const netPL = calcNetPL(t, feePerContract);
              const roc = calcTradeROC(netPL, car);
              const annRoc = calcAnnualizedROC(roc, dit);
              const postTax = calcPostTaxPL(netPL, taxRate);
              const statusClass = t.status === 'Open' ? 'status-info' : netPL >= 0 ? 'status-success' : 'status-error';

              return (
                <tr key={t.id} className="cursor-pointer" onClick={() => { setEditTrade(t); setDialogOpen(true); }}>
                  <td>{t.trade_date}</td>
                  <td className="text-foreground font-sans font-medium">{t.underlying}</td>
                  <td><span className={`status-badge ${t.trade_type === 'CSP' ? 'status-info' : 'status-warning'}`}>{t.trade_type}</span></td>
                  <td>{t.contracts}</td>
                  <td>{t.strike}</td>
                  <td>{t.expiration_date}</td>
                  <td>{t.delta_at_entry != null ? t.delta_at_entry.toFixed(2) : '—'}</td>
                  <td>{t.premium_per_share}</td>
                  <td><span className={`status-badge ${statusClass}`}>{t.status}</span></td>
                  <td className="text-right">{dit}</td>
                  <td className="text-right">{t.status === 'Open' ? dte : '—'}</td>
                  <td className="text-right">{fmtCur(car, t.currency)}</td>
                  <td className={`text-right ${netPL >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtCur(netPL, t.currency)}</td>
                  <td className="text-right">{fmtPct(roc)}</td>
                  <td className="text-right">{fmtPct(annRoc)}</td>
                  <td className="text-right">{fmtCur(postTax, t.currency)}</td>
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
