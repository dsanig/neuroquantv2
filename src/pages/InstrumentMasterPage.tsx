import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInstruments, useUpsertInstrument, useSectors } from "@/hooks/use-settings";
import { Search, Plus, Pencil, Check, AlertTriangle } from "lucide-react";

const MAPPING_STATUSES = ['all', 'unmapped', 'mapped', 'confirmed', 'unresolved'];

function InstrumentForm({ instrument, sectors, onSave, onClose }: { instrument?: any; sectors: any[]; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    company_name: instrument?.company_name || '',
    isin: instrument?.isin || '',
    internal_symbol: instrument?.internal_symbol || '',
    asset_class: instrument?.asset_class || 'Stock',
    country: instrument?.country || '',
    exchange_mic: instrument?.exchange_mic || '',
    currency: instrument?.currency || 'EUR',
    multiplier: instrument?.multiplier || 100,
    sector_id: instrument?.sector_id || '',
    google_finance_symbol: instrument?.google_finance_symbol || '',
    mapping_status: instrument?.mapping_status || 'unmapped',
    preferred_listing: instrument?.preferred_listing || false,
    notes: instrument?.notes || '',
  });

  const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="config-label">Company Name *</label><Input value={form.company_name} onChange={e => update('company_name', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">ISIN</label><Input value={form.isin} onChange={e => update('isin', e.target.value)} className="bg-secondary border-border" placeholder="e.g. DE0007100000" /></div>
        <div><label className="config-label">Internal Symbol</label><Input value={form.internal_symbol} onChange={e => update('internal_symbol', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Asset Class</label>
          <Select value={form.asset_class} onValueChange={v => update('asset_class', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Stock">Stock</SelectItem><SelectItem value="ETF">ETF</SelectItem><SelectItem value="Option">Option</SelectItem><SelectItem value="Index">Index</SelectItem></SelectContent>
          </Select>
        </div>
        <div><label className="config-label">Country</label><Input value={form.country} onChange={e => update('country', e.target.value)} className="bg-secondary border-border" placeholder="e.g. DE" /></div>
        <div><label className="config-label">Exchange MIC</label><Input value={form.exchange_mic} onChange={e => update('exchange_mic', e.target.value)} className="bg-secondary border-border" placeholder="e.g. XETR" /></div>
        <div><label className="config-label">Currency</label><Input value={form.currency} onChange={e => update('currency', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Multiplier</label><Input type="number" value={form.multiplier} onChange={e => update('multiplier', Number(e.target.value))} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Sector</label>
          <Select value={form.sector_id} onValueChange={v => update('sector_id', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select sector" /></SelectTrigger>
            <SelectContent>{sectors.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><label className="config-label">Google Finance Symbol</label><Input value={form.google_finance_symbol} onChange={e => update('google_finance_symbol', e.target.value)} className="bg-secondary border-border" placeholder="e.g. ETR:MBG" /></div>
        <div><label className="config-label">Mapping Status</label>
          <Select value={form.mapping_status} onValueChange={v => update('mapping_status', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unmapped">Unmapped</SelectItem><SelectItem value="mapped">Mapped</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="unresolved">Unresolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><label className="config-label">Notes</label><Input value={form.notes || ''} onChange={e => update('notes', e.target.value)} className="bg-secondary border-border" /></div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => { onSave({ ...instrument, ...form, multiplier: Number(form.multiplier) }); onClose(); }}>
          <Check className="h-3 w-3 mr-1" />Save Instrument
        </Button>
      </div>
    </div>
  );
}

export default function InstrumentMasterPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInstrument, setEditInstrument] = useState<any>(null);
  const { data: instruments, isLoading } = useInstruments({ mapping_status: statusFilter, search: search || undefined });
  const { data: sectors } = useSectors();
  const upsert = useUpsertInstrument();

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { confirmed: 'status-success', mapped: 'status-info', unmapped: 'status-warning', unresolved: 'status-error' };
    return <span className={`status-badge ${map[s] || 'status-neutral'}`}>{s}</span>;
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Instrument Master</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditInstrument(null)}><Plus className="h-3 w-3 mr-1" />Add Instrument</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editInstrument ? 'Edit Instrument' : 'Add Instrument'}</DialogTitle></DialogHeader>
            <InstrumentForm instrument={editInstrument} sectors={sectors || []} onSave={d => upsert.mutate(d)} onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search ISIN, name, symbol..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm bg-secondary border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>{MAPPING_STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{instruments?.length ?? 0} instruments</span>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th><th>ISIN</th><th>Symbol</th><th>Google Symbol</th><th>Exchange</th><th>Currency</th><th>Multiplier</th><th>Sector</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : !instruments?.length ? (
              <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">No instruments found. Add your first instrument to get started.</td></tr>
            ) : instruments.map((inst: any) => (
              <tr key={inst.id}>
                <td className="text-foreground font-sans font-medium">{inst.company_name}</td>
                <td>{inst.isin || '—'}</td>
                <td>{inst.internal_symbol || '—'}</td>
                <td>{inst.google_finance_symbol ? <span className="text-primary">{inst.google_finance_symbol}</span> : <span className="text-muted-foreground">—</span>}</td>
                <td>{inst.exchange_mic || '—'}</td>
                <td>{inst.currency}</td>
                <td>{inst.multiplier}</td>
                <td>{inst.sectors?.name || '—'}</td>
                <td>{statusBadge(inst.mapping_status)}</td>
                <td>
                  <Button size="sm" variant="ghost" onClick={() => { setEditInstrument(inst); setDialogOpen(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
