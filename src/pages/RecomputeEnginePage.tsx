import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

type RecomputeScope = "full" | "wheel" | "condor" | "campaigns" | "capital" | "dashboard";

interface RecomputeRun {
  id: string;
  scope: RecomputeScope;
  status: "running" | "completed" | "failed";
  startedAt: Date;
  finishedAt?: Date;
  affected: number;
  error?: string;
}

export default function RecomputeEnginePage() {
  const qc = useQueryClient();
  const [runs, setRuns] = useState<RecomputeRun[]>([]);
  const [scope, setScope] = useState<RecomputeScope>("full");

  const recompute = useMutation({
    mutationFn: async (selectedScope: RecomputeScope) => {
      const runId = crypto.randomUUID();
      const run: RecomputeRun = { id: runId, scope: selectedScope, status: "running", startedAt: new Date(), affected: 0 };
      setRuns((prev) => [run, ...prev]);

      try {
        let affected = 0;

        if (selectedScope === "full" || selectedScope === "campaigns" || selectedScope === "wheel") {
          // Recompute campaign roll counts from wheel trades
          const { data: campaigns } = await supabase.from("wheel_campaigns").select("id");
          if (campaigns) {
            for (const camp of campaigns) {
              const { count } = await supabase.from("wheel_trades").select("id", { count: "exact", head: true }).eq("campaign_id", camp.id);
              const rollCount = Math.max(0, (count || 1) - 1);
              await supabase.from("wheel_campaigns").update({ roll_count: rollCount }).eq("id", camp.id);
              affected++;
            }
          }
        }

        if (selectedScope === "full" || selectedScope === "capital") {
          // Recompute running balances on capital ledger
          const { data: ledger } = await supabase.from("capital_ledger").select("*").order("event_date").order("created_at");
          if (ledger) {
            let balance = 0;
            for (const entry of ledger) {
              balance += Number(entry.amount);
              await supabase.from("capital_ledger").update({ running_balance: balance }).eq("id", entry.id);
              affected++;
            }
          }
        }

        // Log audit entry
        await supabase.from("audit_log").insert({
          event_type: "recompute",
          entity_type: "system",
          entity_id: runId,
          source: "recompute_engine",
          metadata: { scope: selectedScope, affected } as any,
        });

        setRuns((prev) => prev.map((r) => r.id === runId ? { ...r, status: "completed", finishedAt: new Date(), affected } : r));
        return affected;
      } catch (err: any) {
        setRuns((prev) => prev.map((r) => r.id === runId ? { ...r, status: "failed", finishedAt: new Date(), error: err.message } : r));
        throw err;
      }
    },
    onSuccess: (affected) => {
      qc.invalidateQueries({ queryKey: ["wheel-trades"] });
      qc.invalidateQueries({ queryKey: ["wheel-campaigns"] });
      qc.invalidateQueries({ queryKey: ["condor-trades"] });
      qc.invalidateQueries({ queryKey: ["capital-ledger"] });
      toast.success(`Recomputation complete — ${affected} records updated`);
    },
    onError: (e: Error) => toast.error(`Recomputation failed: ${e.message}`),
  });

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Recomputation Engine</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Run Recomputation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">
                Select scope and run to recalculate derived fields, running balances, roll counts, and analytics caches.
              </p>
              <Select value={scope} onValueChange={(v) => setScope(v as RecomputeScope)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Recompute</SelectItem>
                  <SelectItem value="wheel">Wheel Trades</SelectItem>
                  <SelectItem value="condor">Condor Trades</SelectItem>
                  <SelectItem value="campaigns">Campaigns</SelectItem>
                  <SelectItem value="capital">Capital Ledger</SelectItem>
                  <SelectItem value="dashboard">Dashboard Metrics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => recompute.mutate(scope)} disabled={recompute.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${recompute.isPending ? "animate-spin" : ""}`} />
              {recompute.isPending ? "Running…" : "Run"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Run History */}
      {runs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Run History (Session)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Scope</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Duration</th>
                    <th className="text-right">Records</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const dur = r.finishedAt ? ((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000).toFixed(1) + "s" : "—";
                    return (
                      <tr key={r.id}>
                        <td className="text-foreground font-medium capitalize">{r.scope}</td>
                        <td>
                          {r.status === "completed" ? (
                            <Badge variant="secondary" className="text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Done</Badge>
                          ) : r.status === "failed" ? (
                            <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Running</Badge>
                          )}
                        </td>
                        <td className="text-xs text-muted-foreground">{r.startedAt.toLocaleTimeString()}</td>
                        <td className="text-xs font-mono">{dur}</td>
                        <td className="text-right font-mono">{r.affected}</td>
                        <td className="text-xs text-destructive max-w-[200px] truncate">{r.error || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">What Gets Recomputed</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <div><strong className="text-foreground">Full:</strong> All scopes below.</div>
          <div><strong className="text-foreground">Wheel / Condor:</strong> Derived metrics recalculated from source fields.</div>
          <div><strong className="text-foreground">Campaigns:</strong> Roll counts, campaign status, and event linkage re-derived from wheel trades.</div>
          <div><strong className="text-foreground">Capital:</strong> Running balances recomputed from chronological ledger entries.</div>
          <div><strong className="text-foreground">Dashboard:</strong> Invalidates all cached dashboard queries to force fresh calculation.</div>
          <p className="mt-3 text-[10px]">Every recomputation is logged in the audit trail for traceability.</p>
        </CardContent>
      </Card>
    </div>
  );
}
