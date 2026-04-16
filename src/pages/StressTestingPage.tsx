import { useState } from "react";
import { useWheelTrades, useCondorTrades, useAppSettings, useCapitalLedger } from "@/hooks/use-settings";
import { calcCapitalAtRisk, calcCondorCapitalAtRisk, type WheelTradeRow, type CondorTradeRow } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getSettingNum(settings: any[], key: string, fb: number): number {
  const r = settings?.find((s: any) => s.key === key);
  if (!r) return fb;
  try { return Number(JSON.parse(String(r.value))); } catch { return fb; }
}

function fmtCur(n: number) {
  return n >= 0
    ? `€${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : `-€${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%`; }

interface Scenario {
  name: string;
  shock: number; // e.g. -0.10 for -10%
}

const DEFAULT_SCENARIOS: Scenario[] = [
  { name: "Optimal", shock: 0 },
  { name: "Moderate (-10%)", shock: -0.10 },
  { name: "Severe (-20%)", shock: -0.20 },
  { name: "Black Swan (-35%)", shock: -0.35 },
];

interface ScenarioResult {
  scenario: Scenario;
  wheelPL: number;
  condorPL: number;
  totalPL: number;
  equityImpact: number;
  assignmentExposure: number;
  condorDefinedRisk: number;
  drawdownPct: number;
  wheelBreakdown: { underlying: string; pl: number; assigned: boolean }[];
  condorBreakdown: { underlying: string; pl: number; maxLoss: boolean }[];
}

function stressWheel(trade: WheelTradeRow, shock: number): { pl: number; assigned: boolean } {
  // Assume a reference price of strike (simplified — in production use live price)
  const refPrice = trade.strike;
  const shockedPrice = refPrice * (1 + shock);
  const premium = trade.premium_per_share * trade.contracts * trade.multiplier;

  if (trade.trade_type === "CSP") {
    // CSP: if shocked price < strike, assignment risk
    const intrinsicLoss = Math.max(0, trade.strike - shockedPrice) * trade.contracts * trade.multiplier;
    const netPL = premium - intrinsicLoss;
    return { pl: netPL, assigned: shockedPrice < trade.strike };
  } else {
    // CC: if shocked price drops, equity loss offset by premium
    const basis = trade.stock_cost_basis ?? trade.strike;
    const equityChange = (shockedPrice - basis) * trade.contracts * trade.multiplier;
    const netPL = premium + equityChange;
    return { pl: netPL, assigned: false };
  }
}

function stressCondor(trade: CondorTradeRow, shock: number): { pl: number; maxLoss: boolean } {
  const refPrice = (trade.short_call_strike + trade.short_put_strike) / 2;
  const shockedPrice = refPrice * (1 + shock);
  const premium = trade.premium_per_share * trade.contracts * trade.multiplier;

  const callSpread = Math.abs(trade.long_call_strike - trade.short_call_strike);
  const putSpread = Math.abs(trade.short_put_strike - trade.long_put_strike);

  let loss = 0;
  let atMaxLoss = false;

  if (shockedPrice > trade.short_call_strike) {
    const callLoss = Math.min(shockedPrice - trade.short_call_strike, callSpread) * trade.contracts * trade.multiplier;
    loss += callLoss;
    if (shockedPrice >= trade.long_call_strike) atMaxLoss = true;
  }
  if (shockedPrice < trade.short_put_strike) {
    const putLoss = Math.min(trade.short_put_strike - shockedPrice, putSpread) * trade.contracts * trade.multiplier;
    loss += putLoss;
    if (shockedPrice <= trade.long_put_strike) atMaxLoss = true;
  }

  return { pl: premium - loss, maxLoss: atMaxLoss };
}

export default function StressTestingPage() {
  const { data: wheelTrades, isLoading: wl } = useWheelTrades();
  const { data: condorTrades, isLoading: cload } = useCondorTrades();
  const { data: settings } = useAppSettings();
  const { data: ledger } = useCapitalLedger();

  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [customName, setCustomName] = useState("");
  const [customShock, setCustomShock] = useState("-15");

  const capitalBase = (ledger || []).reduce((s: number, e: any) => s + Number(e.amount), 0);

  const openWheel = ((wheelTrades || []) as any[]).filter((t) => t.status === "Open") as WheelTradeRow[];
  const openCondors = ((condorTrades || []) as any[]).filter((t) => t.status === "Open") as CondorTradeRow[];

  const results: ScenarioResult[] = scenarios.map((scenario) => {
    let wheelPL = 0;
    let assignmentExposure = 0;
    const wheelBreakdown: ScenarioResult["wheelBreakdown"] = [];

    openWheel.forEach((t) => {
      const r = stressWheel(t, scenario.shock);
      wheelPL += r.pl;
      if (r.assigned) assignmentExposure += calcCapitalAtRisk(t);
      wheelBreakdown.push({ underlying: t.underlying, pl: r.pl, assigned: r.assigned });
    });

    let condorPL = 0;
    let condorDefinedRisk = 0;
    const condorBreakdown: ScenarioResult["condorBreakdown"] = [];

    openCondors.forEach((t) => {
      const r = stressCondor(t, scenario.shock);
      condorPL += r.pl;
      if (r.maxLoss) condorDefinedRisk += calcCondorCapitalAtRisk(t);
      condorBreakdown.push({ underlying: t.underlying, pl: r.pl, maxLoss: r.maxLoss });
    });

    const totalPL = wheelPL + condorPL;
    const equityImpact = totalPL;
    const drawdownPct = capitalBase > 0 ? totalPL / capitalBase : 0;

    return { scenario, wheelPL, condorPL, totalPL, equityImpact, assignmentExposure, condorDefinedRisk, drawdownPct, wheelBreakdown, condorBreakdown };
  });

  const addCustomScenario = () => {
    const shock = parseFloat(customShock) / 100;
    if (isNaN(shock)) return;
    const name = customName || `Custom (${customShock}%)`;
    setScenarios([...scenarios, { name, shock }]);
    setCustomName("");
    setCustomShock("-15");
  };

  const isLoading = wl || cload;

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Stress Testing</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : openWheel.length === 0 && openCondors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">No open positions to stress test</p>
          <p className="text-sm">Add open trades in the Wheel or Condor Tracker first.</p>
        </div>
      ) : (
        <>
          {/* Summary Grid */}
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th className="text-right">Shock</th>
                  <th className="text-right">Wheel P/L</th>
                  <th className="text-right">Condor P/L</th>
                  <th className="text-right">Total P/L</th>
                  <th className="text-right">Assignment Exp.</th>
                  <th className="text-right">Condor Max Risk</th>
                  <th className="text-right">Drawdown %</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.scenario.name}>
                    <td className="text-foreground font-medium">{r.scenario.name}</td>
                    <td className="text-right font-mono">{fmtPct(r.scenario.shock)}</td>
                    <td className={`text-right font-mono ${r.wheelPL >= 0 ? "text-success" : "text-destructive"}`}>{fmtCur(r.wheelPL)}</td>
                    <td className={`text-right font-mono ${r.condorPL >= 0 ? "text-success" : "text-destructive"}`}>{fmtCur(r.condorPL)}</td>
                    <td className={`text-right font-mono font-semibold ${r.totalPL >= 0 ? "text-success" : "text-destructive"}`}>{fmtCur(r.totalPL)}</td>
                    <td className="text-right font-mono">{fmtCur(r.assignmentExposure)}</td>
                    <td className="text-right font-mono">{fmtCur(r.condorDefinedRisk)}</td>
                    <td className={`text-right font-mono font-semibold ${r.drawdownPct >= 0 ? "text-success" : "text-destructive"}`}>{fmtPct(r.drawdownPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-Underlying Breakdown */}
          {results.filter((r) => r.scenario.shock !== 0).map((r) => (
            <Card key={r.scenario.name}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{r.scenario.name} — Per-Position Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {r.wheelBreakdown.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Wheel Positions</h3>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Underlying</th>
                            <th className="text-right">Projected P/L</th>
                            <th>Assignment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.wheelBreakdown.map((b, i) => (
                            <tr key={i}>
                              <td className="text-foreground">{b.underlying}</td>
                              <td className={`text-right font-mono ${b.pl >= 0 ? "text-success" : "text-destructive"}`}>{fmtCur(b.pl)}</td>
                              <td>
                                {b.assigned ? (
                                  <Badge variant="destructive" className="text-[10px]">LIKELY</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">Safe</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {r.condorBreakdown.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Condor Positions</h3>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Underlying</th>
                            <th className="text-right">Projected P/L</th>
                            <th>Max Loss</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.condorBreakdown.map((b, i) => (
                            <tr key={i}>
                              <td className="text-foreground">{b.underlying}</td>
                              <td className={`text-right font-mono ${b.pl >= 0 ? "text-success" : "text-destructive"}`}>{fmtCur(b.pl)}</td>
                              <td>
                                {b.maxLoss ? (
                                  <Badge variant="destructive" className="text-[10px]">MAX LOSS</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">Partial</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Custom Scenario */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Add Custom Scenario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Name (optional)</Label>
                  <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Flash Crash" className="h-8 text-sm" />
                </div>
                <div className="w-32">
                  <Label className="text-xs">Shock %</Label>
                  <Input value={customShock} onChange={(e) => setCustomShock(e.target.value)} placeholder="-15" className="h-8 text-sm font-mono" />
                </div>
                <Button size="sm" onClick={addCustomScenario}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
