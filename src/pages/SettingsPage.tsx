import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSettings, useUpsertAppSetting, useSectors, useUpsertSector, useFeeSchedules, useUpsertFeeSchedule, useTaxProfiles } from "@/hooks/use-settings";
import { toast } from "sonner";
import { Plus, Save, Pencil } from "lucide-react";

function SettingRow({ label, description, settingKey, settings, onSave, type = 'text' }: {
  label: string; description: string; settingKey: string; settings: any[]; onSave: (key: string, val: any) => void; type?: string;
}) {
  const current = settings?.find((s: any) => s.key === settingKey);
  let parsed: any;
  try { parsed = current ? JSON.parse(String(current.value)) : ''; } catch { parsed = current?.value ?? ''; }
  const [val, setVal] = useState(String(parsed).replace(/^"|"$/g, ''));
  useEffect(() => {
    try { const p = current ? JSON.parse(String(current.value)) : ''; setVal(String(p).replace(/^"|"$/g, '')); } catch {}
  }, [current]);

  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-2">
        <div><div className="text-sm text-foreground">{label}</div><div className="text-xs text-muted-foreground">{description}</div></div>
        <Switch checked={parsed === true || parsed === 'true'} onCheckedChange={v => onSave(settingKey, v)} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end py-2">
      <div className="md:col-span-2"><label className="config-label">{label}</label><div className="text-xs text-muted-foreground mb-1">{description}</div>
        <Input value={val} onChange={e => setVal(e.target.value)} className="bg-secondary border-border" type={type === 'number' ? 'number' : 'text'} />
      </div>
      <Button size="sm" variant="outline" onClick={() => onSave(settingKey, type === 'number' ? Number(val) : val)} className="h-9"><Save className="h-3 w-3 mr-1" />Save</Button>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useAppSettings();
  const saveSetting = useUpsertAppSetting();
  const { data: sectors } = useSectors();
  const upsertSector = useUpsertSector();
  const { data: fees } = useFeeSchedules();
  const upsertFee = useUpsertFeeSchedule();
  const { data: taxProfiles } = useTaxProfiles();
  const [newSector, setNewSector] = useState('');
  const [editFee, setEditFee] = useState<Record<string, number>>({});

  const handleSave = (key: string, value: any) => {
    saveSetting.mutate({ key, value, category: 'general' });
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Settings / Admin</h1>
      </div>

      <div className="space-y-6">
        {/* General */}
        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-2">General</h2>
          <SettingRow label="Reporting Currency" description="Base currency for all reporting" settingKey="reporting_currency" settings={settings || []} onSave={handleSave} />
          <SettingRow label="Timezone" description="Application timezone" settingKey="timezone" settings={settings || []} onSave={handleSave} />
          <SettingRow label="Date Format" description="Display date format" settingKey="date_format" settings={settings || []} onSave={handleSave} />
          <SettingRow label="Default Multiplier" description="Default options contract multiplier" settingKey="default_multiplier" settings={settings || []} onSave={handleSave} type="number" />
        </div>

        {/* Trading */}
        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-2">Trading & Fees</h2>
          <SettingRow label="Fee per Contract" description="Default fee charged per options contract" settingKey="fee_per_contract" settings={settings || []} onSave={handleSave} type="number" />
          <SettingRow label="Estimated Tax Rate" description="Tax rate for P/L projections (decimal, e.g. 0.25 = 25%)" settingKey="estimated_tax_rate" settings={settings || []} onSave={handleSave} type="number" />
          
          {fees && fees.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm text-foreground font-medium mb-2">Fee Schedules by Strategy</h3>
              <table className="data-table">
                <thead><tr><th>Strategy</th><th>Fee/Contract</th><th>Per Leg</th><th></th></tr></thead>
                <tbody>
                  {fees.map((f: any) => (
                    <tr key={f.id}>
                      <td className="text-foreground font-sans">{f.strategy_type}</td>
                      <td>
                        <Input type="number" step="0.01" defaultValue={f.fee_per_contract} className="bg-secondary border-border w-24 h-7 text-xs"
                          onChange={e => setEditFee(prev => ({ ...prev, [f.id]: Number(e.target.value) }))} />
                      </td>
                      <td>{f.per_leg ? 'Yes' : 'No'}</td>
                      <td>
                        <Button size="sm" variant="ghost" onClick={() => upsertFee.mutate({ ...f, fee_per_contract: editFee[f.id] ?? f.fee_per_contract })}>
                          <Save className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Concentration & Liquidity */}
        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-2">Concentration & Liquidity</h2>
          <SettingRow label="Cash Reserve Target" description="Target cash reserve as fraction of capital (e.g. 0.20)" settingKey="cash_reserve_target" settings={settings || []} onSave={handleSave} type="number" />
          <SettingRow label="Max Single Position" description="Max single position as fraction of capital (e.g. 0.33)" settingKey="max_single_position" settings={settings || []} onSave={handleSave} type="number" />
          <SettingRow label="Max Sector Concentration" description="Max sector concentration as fraction of capital" settingKey="max_sector_concentration" settings={settings || []} onSave={handleSave} type="number" />
        </div>

        {/* Data */}
        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-2">Data & Quotes</h2>
          <SettingRow label="Allow Delayed Quotes" description="Accept delayed market data" settingKey="allow_delayed_quotes" settings={settings || []} onSave={handleSave} type="boolean" />
          <SettingRow label="Quote Staleness (minutes)" description="Minutes before a quote is considered stale" settingKey="quote_staleness_threshold_minutes" settings={settings || []} onSave={handleSave} type="number" />
          <SettingRow label="Recompute on Refresh" description="Trigger analytics recomputation on data refresh" settingKey="recompute_on_refresh" settings={settings || []} onSave={handleSave} type="boolean" />
        </div>

        {/* Stress Testing */}
        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-2">Stress Scenarios</h2>
          <SettingRow label="Moderate Shock" description="Moderate stress scenario (e.g. -0.10 = -10%)" settingKey="stress_scenario_moderate" settings={settings || []} onSave={handleSave} type="number" />
          <SettingRow label="Severe Shock" description="Severe stress scenario (e.g. -0.20 = -20%)" settingKey="stress_scenario_severe" settings={settings || []} onSave={handleSave} type="number" />
          <SettingRow label="Black Swan Shock" description="Black swan scenario (e.g. -0.35 = -35%)" settingKey="stress_scenario_black_swan" settings={settings || []} onSave={handleSave} type="number" />
        </div>

        {/* Sectors */}
        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-2">Sector Master</h2>
          <div className="flex gap-2 mb-3">
            <Input placeholder="New sector name..." value={newSector} onChange={e => setNewSector(e.target.value)} className="bg-secondary border-border" />
            <Button size="sm" onClick={() => {
              if (!newSector.trim()) return;
              upsertSector.mutate({ name: newSector.trim(), display_order: (sectors?.length ?? 0) + 1, active: true });
              setNewSector('');
            }}><Plus className="h-3 w-3 mr-1" />Add</Button>
          </div>
          {sectors && sectors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sectors.map((s: any) => (
                <span key={s.id} className={`status-badge ${s.active ? 'status-info' : 'status-neutral'}`}>
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Strategy Types Reference */}
        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-2">Strategy Types & Statuses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm text-foreground font-medium mb-2">Strategy Types</h3>
              <div className="flex flex-wrap gap-1.5">
                {['CSP', 'CC', 'Iron Condor'].map(s => <span key={s} className="status-badge status-info">{s}</span>)}
              </div>
            </div>
            <div>
              <h3 className="text-sm text-foreground font-medium mb-2">Wheel Statuses</h3>
              <div className="flex flex-wrap gap-1.5">
                {['Open', 'Expired', 'Assigned', 'Called Away', 'BTC', 'BTC (Roll)'].map(s => <span key={s} className="status-badge status-neutral">{s}</span>)}
              </div>
            </div>
            <div>
              <h3 className="text-sm text-foreground font-medium mb-2">Iron Condor Statuses</h3>
              <div className="flex flex-wrap gap-1.5">
                {['Open', 'BTC (Profit)', 'BTC (Loss)', 'Expired', 'Rolled', 'Assigned'].map(s => <span key={s} className="status-badge status-neutral">{s}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
