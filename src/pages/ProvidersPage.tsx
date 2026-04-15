import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMarketDataProviders, useUpdateProvider } from "@/hooks/use-settings";
import { Save, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

function healthIcon(status: string) {
  if (status === 'healthy') return <CheckCircle className="h-3.5 w-3.5 text-success" />;
  if (status === 'error') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  if (status === 'degraded') return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
  return <span className="h-3.5 w-3.5 rounded-full bg-muted-foreground/30 inline-block" />;
}

export default function ProvidersPage() {
  const { data: providers, isLoading } = useMarketDataProviders();
  const updateProvider = useUpdateProvider();
  const [editState, setEditState] = useState<Record<string, any>>({});

  const getEdit = (id: string, field: string, fallback: any) => editState[id]?.[field] ?? fallback;
  const setEdit = (id: string, field: string, val: any) => setEditState(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }));

  const saveProvider = (p: any) => {
    const edits = editState[p.id] || {};
    updateProvider.mutate({ ...p, ...edits });
    setEditState(prev => { const n = { ...prev }; delete n[p.id]; return n; });
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Data Input & Integrations</h1>
      </div>

      {isLoading ? <div className="text-center py-8 text-muted-foreground">Loading providers...</div> : (
        <div className="space-y-4">
          {/* Provider Cards */}
          {(providers || []).map((p: any) => (
            <div key={p.id} className="config-panel">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {healthIcon(p.health_status)}
                  <div>
                    <div className="text-foreground font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.provider_type} · Priority: {p.priority}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={getEdit(p.id, 'enabled', p.enabled)} onCheckedChange={v => setEdit(p.id, 'enabled', v)} />
                  <Button size="sm" variant="outline" onClick={() => saveProvider(p)}><Save className="h-3 w-3 mr-1" />Save</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="config-label">Priority</label>
                  <Input type="number" value={getEdit(p.id, 'priority', p.priority)} onChange={e => setEdit(p.id, 'priority', Number(e.target.value))} className="bg-secondary border-border h-8 text-sm" />
                </div>
                <div>
                  <label className="config-label">Cache Duration (sec)</label>
                  <Input type="number" value={getEdit(p.id, 'cache_duration_seconds', p.cache_duration_seconds)} onChange={e => setEdit(p.id, 'cache_duration_seconds', Number(e.target.value))} className="bg-secondary border-border h-8 text-sm" />
                </div>
                <div>
                  <label className="config-label">Rate Limit/min</label>
                  <Input type="number" value={getEdit(p.id, 'rate_limit_per_minute', p.rate_limit_per_minute ?? '')} onChange={e => setEdit(p.id, 'rate_limit_per_minute', e.target.value ? Number(e.target.value) : null)} className="bg-secondary border-border h-8 text-sm" />
                </div>
                <div>
                  <label className="config-label">Stale Threshold (sec)</label>
                  <Input type="number" value={getEdit(p.id, 'stale_threshold_seconds', p.stale_threshold_seconds)} onChange={e => setEdit(p.id, 'stale_threshold_seconds', Number(e.target.value))} className="bg-secondary border-border h-8 text-sm" />
                </div>
                <div>
                  <label className="config-label">API Key Ref</label>
                  <Input value={getEdit(p.id, 'api_key_ref', p.api_key_ref ?? '')} onChange={e => setEdit(p.id, 'api_key_ref', e.target.value)} className="bg-secondary border-border h-8 text-sm" placeholder="Secret name" />
                </div>
                <div>
                  <label className="config-label">Retry Max</label>
                  <Input type="number" value={getEdit(p.id, 'retry_max', p.retry_max)} onChange={e => setEdit(p.id, 'retry_max', Number(e.target.value))} className="bg-secondary border-border h-8 text-sm" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="config-label">Use Cases</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(p.use_cases || []).map((uc: string) => (
                      <span key={uc} className="status-badge status-info text-[10px]">{uc.replace(/_/g, ' ')}</span>
                    ))}
                    {(p.use_cases || []).length === 0 && <span className="text-xs text-muted-foreground">None configured</span>}
                  </div>
                </div>
                <div>
                  <label className="config-label">Status</label>
                  <div className="text-xs mt-1 space-y-0.5">
                    {p.last_successful_fetch && <div className="text-muted-foreground">Last OK: {new Date(p.last_successful_fetch).toLocaleString()}</div>}
                    {p.last_error && <div className="text-destructive">Error: {p.last_error}</div>}
                    {!p.last_successful_fetch && !p.last_error && <div className="text-muted-foreground">No activity recorded</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
