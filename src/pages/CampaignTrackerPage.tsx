import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWheelCampaigns, useWheelTrades, useAppSettings } from "@/hooks/use-settings";
import { calcCampaignMetrics, calcNetPL, calcCapitalAtRisk } from "@/lib/calculations";
import { Plus, ChevronDown, ChevronRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function getSettingNum(settings: any[], key: string, fallback: number): number {
  const row = settings?.find((s: any) => s.key === key);
  if (!row) return fallback;
  try { return Number(JSON.parse(String(row.value))); } catch { return fallback; }
}
function fmtCur(n: number) { return n >= 0 ? `€${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-€${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`; }
function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%`; }

const STATUSES = ['all', 'Open', 'Closed', 'Assigned', 'Called Away', 'Rolling'];

function CampaignForm({ onSave, onClose }: { onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ underlying: '', campaign_start: new Date().toISOString().slice(0, 10), account: '', notes: '' });
  const u = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="config-label">Underlying *</label><Input value={form.underlying} onChange={e => u('underlying', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Start Date *</label><Input type="date" value={form.campaign_start} onChange={e => u('campaign_start', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Account</label><Input value={form.account} onChange={e => u('account', e.target.value)} className="bg-secondary border-border" /></div>
        <div><label className="config-label">Notes</label><Input value={form.notes} onChange={e => u('notes', e.target.value)} className="bg-secondary border-border" /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => { onSave(form); onClose(); }}><Check className="h-3 w-3 mr-1" />Create Campaign</Button>
      </div>
    </div>
  );
}

export default function CampaignTrackerPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: campaigns, isLoading } = useWheelCampaigns({ status: statusFilter });
  const { data: allTrades } = useWheelTrades();
  const { data: settings } = useAppSettings();
  const qc = useQueryClient();

  const feePerContract = getSettingNum(settings || [], 'fee_per_contract', 1.25);
  const taxRate = getSettingNum(settings || [], 'estimated_tax_rate', 0.25);

  const tradesByCampaign: Record<string, any[]> = {};
  (allTrades || []).forEach((t: any) => {
    if (t.campaign_id) {
      if (!tradesByCampaign[t.campaign_id]) tradesByCampaign[t.campaign_id] = [];
      tradesByCampaign[t.campaign_id].push(t);
    }
  });

  const createCampaign = async (data: any) => {
    const { error } = await supabase.from('wheel_campaigns').insert(data);
    if (error) { toast.error(error.message); return; }
    toast.success('Campaign created');
    qc.invalidateQueries({ queryKey: ['wheel-campaigns'] });
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Campaign Tracker</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />New Campaign</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader><CampaignForm onSave={createCampaign} onClose={() => setDialogOpen(false)} /></DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All' : s}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{campaigns?.length ?? 0} campaigns</span>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !campaigns?.length ? (
          <div className="text-center py-8 text-muted-foreground">No campaigns yet. Create a campaign and link trades to it.</div>
        ) : campaigns.map((c: any) => {
          const cTrades = tradesByCampaign[c.id] || [];
          const metrics = calcCampaignMetrics(cTrades, feePerContract, taxRate);
          const isExpanded = expanded[c.id];

          return (
            <div key={c.id} className="config-panel !p-0">
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}>
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <div className="text-foreground font-sans font-medium">{c.underlying}</div>
                    <div className="text-xs text-muted-foreground">{c.campaign_start}{c.campaign_end ? ` → ${c.campaign_end}` : ' → ongoing'} · {c.account || 'default'}</div>
                  </div>
                  <span className={`status-badge ${c.status === 'Open' ? 'status-info' : 'status-success'}`}>{c.status}</span>
                  {c.assignment_flag && <span className="status-badge status-warning">Assigned</span>}
                  {c.called_away_flag && <span className="status-badge status-warning">Called Away</span>}
                </div>
                {metrics && (
                  <div className="flex gap-6 text-xs">
                    <div><span className="text-muted-foreground">Net P/L </span><span className={metrics.netPL >= 0 ? 'text-success' : 'text-destructive'}>{fmtCur(metrics.netPL)}</span></div>
                    <div><span className="text-muted-foreground">Max Capital </span><span>{fmtCur(metrics.maxCapital)}</span></div>
                    <div><span className="text-muted-foreground">ROC </span><span>{fmtPct(metrics.roc)}</span></div>
                    <div><span className="text-muted-foreground">Ann ROC </span><span>{fmtPct(metrics.annualizedROC)}</span></div>
                    <div><span className="text-muted-foreground">Rolls </span><span>{metrics.rollCount}</span></div>
                    <div><span className="text-muted-foreground">Days </span><span>{metrics.totalDays}</span></div>
                  </div>
                )}
              </div>
              {isExpanded && cTrades.length > 0 && (
                <div className="border-t border-border px-4 pb-4">
                  <table className="data-table mt-2">
                    <thead><tr><th>Date</th><th>Type</th><th>Strike</th><th>Exp</th><th>Premium</th><th>Status</th><th className="text-right">Net P/L</th></tr></thead>
                    <tbody>
                      {cTrades.map((t: any) => {
                        const netPL = calcNetPL(t, feePerContract);
                        return (
                          <tr key={t.id}>
                            <td>{t.trade_date}</td>
                            <td><span className={`status-badge ${t.trade_type === 'CSP' ? 'status-info' : 'status-warning'}`}>{t.trade_type}</span></td>
                            <td>{t.strike}</td>
                            <td>{t.expiration_date}</td>
                            <td>{t.premium_per_share}</td>
                            <td><span className="status-badge status-neutral">{t.status}</span></td>
                            <td className={`text-right ${netPL >= 0 ? 'text-success' : 'text-destructive'}`}>{fmtCur(netPL)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {isExpanded && cTrades.length === 0 && (
                <div className="border-t border-border p-4 text-xs text-muted-foreground">No trades linked to this campaign yet. Assign trades from the Wheel Tracker.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
