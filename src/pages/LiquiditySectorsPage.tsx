import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { useWheelTrades, useCondorTrades, useAppSettings, useCapitalLedger, useSectors } from "@/hooks/use-settings";
import { calcCapitalAtRisk, calcCondorCapitalAtRisk, type WheelTradeRow, type CondorTradeRow } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type Denominator = "capital_base" | "active_capital" | "settled_cash";

export default function LiquiditySectorsPage() {
  const { data: wheelTrades, isLoading: wl } = useWheelTrades();
  const { data: condorTrades, isLoading: cl } = useCondorTrades();
  const { data: settings } = useAppSettings();
  const { data: ledger } = useCapitalLedger();
  const { data: sectors } = useSectors();

  const [denominator, setDenominator] = useState<Denominator>("capital_base");

  const reserveTarget = getSettingNum(settings || [], "reserve_target", 0.2);
  const maxSinglePosition = getSettingNum(settings || [], "max_single_position", 0.33);
  const maxSectorConcentration = getSettingNum(settings || [], "max_sector_concentration", 0.33);

  const capitalBase = (ledger || []).reduce((s: number, e: any) => s + Number(e.amount), 0);

  // Open wheel trades
  const openWheel = ((wheelTrades || []) as any[]).filter((t) => t.status === "Open");
  const openCondors = ((condorTrades || []) as any[]).filter((t) => t.status === "Open");

  // Active capital
  let wheelCapital = 0;
  const positionMap: Record<string, number> = {};
  const sectorCapitalMap: Record<string, number> = {};

  openWheel.forEach((t) => {
    const car = calcCapitalAtRisk(t as WheelTradeRow);
    wheelCapital += car;
    const key = t.underlying || "Unknown";
    positionMap[key] = (positionMap[key] || 0) + car;

    const sectorName = t.sectors?.name || "Unassigned";
    sectorCapitalMap[sectorName] = (sectorCapitalMap[sectorName] || 0) + car;
  });

  let condorCapital = 0;
  openCondors.forEach((t) => {
    const car = calcCondorCapitalAtRisk(t as CondorTradeRow);
    condorCapital += car;
    const key = t.underlying || "Unknown";
    positionMap[key] = (positionMap[key] || 0) + car;
  });

  const activeCapital = wheelCapital + condorCapital;
  const settledCash = capitalBase; // simplified — ledger sum
  const cashOnHand = capitalBase - activeCapital;

  const denomValue =
    denominator === "capital_base" ? capitalBase
    : denominator === "active_capital" ? activeCapital
    : settledCash;

  const liquidityRatio = capitalBase > 0 ? cashOnHand / capitalBase : 0;
  const cashNeedingDeployment = Math.max(0, cashOnHand - capitalBase * reserveTarget);
  const capitalUtilization = capitalBase > 0 ? activeCapital / capitalBase : 0;

  // Position concentration
  const positionEntries = Object.entries(positionMap).sort((a, b) => b[1] - a[1]);

  // Sector concentration
  const sectorEntries = Object.entries(sectorCapitalMap).sort((a, b) => b[1] - a[1]);

  const isLoading = wl || cl;

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Liquidity & Sector Controls</h1>
        <Select value={denominator} onValueChange={(v) => setDenominator(v as Denominator)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="capital_base">Capital Base</SelectItem>
            <SelectItem value="active_capital">Active Capital</SelectItem>
            <SelectItem value="settled_cash">Settled Cash</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Liquidity KPIs */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Liquidity Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard label="Capital Base" value={fmtCur(capitalBase)} />
              <MetricCard label="Active Capital" value={fmtCur(activeCapital)} />
              <MetricCard label="Cash on Hand" value={fmtCur(cashOnHand)} changeType={cashOnHand < capitalBase * reserveTarget ? "negative" : "positive"} />
              <MetricCard label="Liquidity Ratio" value={fmtPct(liquidityRatio)} changeType={liquidityRatio < reserveTarget ? "negative" : "positive"} />
              <MetricCard label="Capital Utilization" value={fmtPct(capitalUtilization)} />
              <MetricCard label="Deployable Cash" value={fmtCur(cashNeedingDeployment)} />
            </div>
            {liquidityRatio < reserveTarget && (
              <div className="mt-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                ⚠ Cash reserve below target ({fmtPct(reserveTarget)}). Current liquidity ratio: {fmtPct(liquidityRatio)}
              </div>
            )}
          </div>

          {/* Position Concentration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Position Concentration</CardTitle>
            </CardHeader>
            <CardContent>
              {positionEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No open positions</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Underlying</th>
                        <th className="text-right">Capital at Risk</th>
                        <th className="text-right">% of {denominator === "capital_base" ? "Capital" : denominator === "active_capital" ? "Active" : "Cash"}</th>
                        <th className="text-right">Headroom</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positionEntries.map(([name, capital]) => {
                        const pct = denomValue > 0 ? capital / denomValue : 0;
                        const headroom = Math.max(0, maxSinglePosition - pct);
                        const breach = pct > maxSinglePosition;
                        return (
                          <tr key={name}>
                            <td className="text-foreground font-medium">{name}</td>
                            <td className="text-right font-mono">{fmtCur(capital)}</td>
                            <td className={`text-right font-mono ${breach ? "text-destructive font-semibold" : ""}`}>{fmtPct(pct)}</td>
                            <td className="text-right font-mono">{fmtPct(headroom)}</td>
                            <td>
                              {breach ? (
                                <Badge variant="destructive" className="text-[10px]">BREACH</Badge>
                              ) : pct > maxSinglePosition * 0.8 ? (
                                <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-500">WARNING</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">OK</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">Max single position: {fmtPct(maxSinglePosition)} (configurable in Settings)</p>
            </CardContent>
          </Card>

          {/* Sector Concentration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Sector Concentration</CardTitle>
            </CardHeader>
            <CardContent>
              {sectorEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sector-assigned open positions</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Sector</th>
                          <th className="text-right">Active Capital</th>
                          <th className="text-right">% of {denominator === "capital_base" ? "Capital" : denominator === "active_capital" ? "Active" : "Cash"}</th>
                          <th className="text-right">Headroom</th>
                          <th>Compliance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectorEntries.map(([sector, capital]) => {
                          const pct = denomValue > 0 ? capital / denomValue : 0;
                          const headroom = Math.max(0, maxSectorConcentration - pct);
                          const breach = pct > maxSectorConcentration;
                          return (
                            <tr key={sector}>
                              <td className="text-foreground font-medium">{sector}</td>
                              <td className="text-right font-mono">{fmtCur(capital)}</td>
                              <td className={`text-right font-mono ${breach ? "text-destructive font-semibold" : ""}`}>{fmtPct(pct)}</td>
                              <td className="text-right font-mono">{fmtPct(headroom)}</td>
                              <td>
                                {breach ? (
                                  <Badge variant="destructive" className="text-[10px]">BREACH</Badge>
                                ) : pct > maxSectorConcentration * 0.8 ? (
                                  <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-500">WARNING</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">OK</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Visual bar chart */}
                  <div className="mt-4 space-y-2">
                    {sectorEntries.map(([sector, capital]) => {
                      const pct = denomValue > 0 ? capital / denomValue : 0;
                      const breach = pct > maxSectorConcentration;
                      return (
                        <div key={sector} className="flex items-center gap-2 text-xs">
                          <span className="w-32 truncate text-muted-foreground">{sector}</span>
                          <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden relative">
                            <div
                              className={`h-full rounded-sm ${breach ? "bg-destructive" : "bg-primary"}`}
                              style={{ width: `${Math.min(pct * 100, 100)}%` }}
                            />
                            <div
                              className="absolute top-0 h-full w-px bg-foreground/40"
                              style={{ left: `${maxSectorConcentration * 100}%` }}
                              title={`Limit: ${fmtPct(maxSectorConcentration)}`}
                            />
                          </div>
                          <span className="w-12 text-right font-mono">{fmtPct(pct)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">Max sector concentration: {fmtPct(maxSectorConcentration)} (configurable in Settings)</p>
            </CardContent>
          </Card>

          {/* Strategy Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Capital by Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-mono font-semibold text-foreground">{fmtCur(openWheel.filter((t) => t.trade_type === "CSP").reduce((s, t) => s + calcCapitalAtRisk(t as WheelTradeRow), 0))}</p>
                  <p className="text-xs text-muted-foreground mt-1">CSP Capital</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-mono font-semibold text-foreground">{fmtCur(openWheel.filter((t) => t.trade_type === "CC").reduce((s, t) => s + calcCapitalAtRisk(t as WheelTradeRow), 0))}</p>
                  <p className="text-xs text-muted-foreground mt-1">CC Capital</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-mono font-semibold text-foreground">{fmtCur(condorCapital)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Condor Capital</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
