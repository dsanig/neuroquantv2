import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";

function fmtCur(n: number) {
  return n >= 0
    ? `€${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : `-€${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function fmtPct(n: number) { return `${(n * 100).toFixed(2)}%`; }

// ---- CSP/CC Comparison ----

interface WheelCandidate {
  id: number;
  ticker: string;
  isin: string;
  googleSymbol: string;
  currentPrice: number;
  strike: number;
  premium: number;
  dte: number;
  contracts: number;
  multiplier: number;
  type: "CSP" | "CC";
}

function emptyWheel(id: number): WheelCandidate {
  return { id, ticker: "", isin: "", googleSymbol: "", currentPrice: 0, strike: 0, premium: 0, dte: 30, contracts: 1, multiplier: 100, type: "CSP" };
}

function calcWheelMetrics(c: WheelCandidate) {
  const capitalAtRisk = c.type === "CSP"
    ? c.strike * c.contracts * c.multiplier
    : c.currentPrice * c.contracts * c.multiplier;
  const totalPremium = c.premium * c.contracts * c.multiplier;
  const downsideCushion = c.currentPrice > 0 ? (c.currentPrice - c.strike) / c.currentPrice : 0;
  const absROC = capitalAtRisk > 0 ? totalPremium / capitalAtRisk : 0;
  const annROC = c.dte > 0 ? absROC * (365 / c.dte) : 0;
  return { capitalAtRisk, totalPremium, downsideCushion, absROC, annROC };
}

// ---- Iron Condor Comparison ----

interface CondorCandidate {
  id: number;
  ticker: string;
  currentPrice: number;
  shortCall: number;
  longCall: number;
  shortPut: number;
  longPut: number;
  premium: number;
  dte: number;
  contracts: number;
  multiplier: number;
}

function emptyCondor(id: number): CondorCandidate {
  return { id, ticker: "", currentPrice: 0, shortCall: 0, longCall: 0, shortPut: 0, longPut: 0, premium: 0, dte: 30, contracts: 1, multiplier: 100 };
}

function calcCondorMetrics(c: CondorCandidate) {
  const callSpread = Math.abs(c.longCall - c.shortCall);
  const putSpread = Math.abs(c.shortPut - c.longPut);
  const maxSpread = Math.max(callSpread, putSpread);
  const maxProfit = c.premium * c.contracts * c.multiplier;
  const maxRisk = Math.max(0, (maxSpread - c.premium) * c.contracts * c.multiplier);
  const riskReward = maxRisk > 0 ? maxProfit / maxRisk : 0;
  const upperBE = c.shortCall + c.premium;
  const lowerBE = c.shortPut - c.premium;
  const tentWidth = upperBE - lowerBE;
  const absROC = maxRisk > 0 ? maxProfit / maxRisk : 0;
  const annROC = c.dte > 0 ? absROC * (365 / c.dte) : 0;
  return { maxProfit, maxRisk, riskReward, upperBE, lowerBE, tentWidth, absROC, annROC };
}

type CondorSort = "annROC" | "riskReward" | "tentWidth" | "premiumRisk";

export default function ComparisonLabPage() {
  // Wheel state
  const [wheelMode, setWheelMode] = useState<"CSP" | "CC">("CSP");
  const [wheelCandidates, setWheelCandidates] = useState<WheelCandidate[]>([emptyWheel(1), emptyWheel(2)]);

  // Condor state
  const [condorCandidates, setCondorCandidates] = useState<CondorCandidate[]>([emptyCondor(1), emptyCondor(2)]);
  const [condorSort, setCondorSort] = useState<CondorSort>("annROC");

  const updateWheel = (id: number, field: keyof WheelCandidate, value: any) => {
    setWheelCandidates((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateCondor = (id: number, field: keyof CondorCandidate, value: any) => {
    setCondorCandidates((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const addWheelCandidate = () => {
    if (wheelCandidates.length >= 4) return;
    setWheelCandidates((prev) => [...prev, emptyWheel(Date.now())]);
  };

  const addCondorCandidate = () => {
    if (condorCandidates.length >= 4) return;
    setCondorCandidates((prev) => [...prev, emptyCondor(Date.now())]);
  };

  // Sort condor candidates
  const sortedCondors = [...condorCandidates].sort((a, b) => {
    const ma = calcCondorMetrics(a);
    const mb = calcCondorMetrics(b);
    switch (condorSort) {
      case "annROC": return mb.annROC - ma.annROC;
      case "riskReward": return mb.riskReward - ma.riskReward;
      case "tentWidth": return mb.tentWidth - ma.tentWidth;
      case "premiumRisk": return (mb.maxRisk > 0 ? mb.maxProfit / mb.maxRisk : 0) - (ma.maxRisk > 0 ? ma.maxProfit / ma.maxRisk : 0);
      default: return 0;
    }
  });

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Comparison Lab</h1>
      </div>

      <Tabs defaultValue="wheel" className="w-full">
        <TabsList>
          <TabsTrigger value="wheel">CSP / CC Comparison</TabsTrigger>
          <TabsTrigger value="condor">Iron Condor Comparison</TabsTrigger>
        </TabsList>

        {/* ===== WHEEL TAB ===== */}
        <TabsContent value="wheel" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select value={wheelMode} onValueChange={(v) => {
              setWheelMode(v as "CSP" | "CC");
              setWheelCandidates((prev) => prev.map((c) => ({ ...c, type: v as "CSP" | "CC" })));
            }}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CSP">CSP</SelectItem>
                <SelectItem value="CC">CC</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={addWheelCandidate} disabled={wheelCandidates.length >= 4}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>

          {/* Input cards side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {wheelCandidates.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Candidate {c.ticker || "#"}</CardTitle>
                  {wheelCandidates.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setWheelCandidates((prev) => prev.filter((x) => x.id !== c.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {([
                    ["ticker", "Ticker", "text"],
                    ["isin", "ISIN", "text"],
                    ["currentPrice", "Current Price", "number"],
                    ["strike", "Strike", "number"],
                    ["premium", "Premium/Share", "number"],
                    ["dte", "DTE", "number"],
                    ["contracts", "Contracts", "number"],
                    ["multiplier", "Multiplier", "number"],
                  ] as [keyof WheelCandidate, string, string][]).map(([field, label, type]) => (
                    <div key={field}>
                      <Label className="text-[10px] text-muted-foreground">{label}</Label>
                      <Input
                        type={type}
                        value={c[field]}
                        onChange={(e) => updateWheel(c.id, field, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Results table */}
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Strike</th>
                  <th className="text-right">Premium</th>
                  <th className="text-right">DTE</th>
                  <th className="text-right">Capital Req.</th>
                  <th className="text-right">Downside Cushion</th>
                  <th className="text-right">ROC</th>
                  <th className="text-right">Ann. ROC</th>
                </tr>
              </thead>
              <tbody>
                {wheelCandidates.map((c) => {
                  const m = calcWheelMetrics(c);
                  const best = wheelCandidates.reduce((best, x) => {
                    const xm = calcWheelMetrics(x);
                    return xm.annROC > best ? xm.annROC : best;
                  }, 0);
                  return (
                    <tr key={c.id}>
                      <td className="text-foreground font-medium">{c.ticker || "—"}</td>
                      <td className="text-right font-mono">{fmtCur(c.currentPrice)}</td>
                      <td className="text-right font-mono">{fmtCur(c.strike)}</td>
                      <td className="text-right font-mono">{fmtCur(c.premium)}</td>
                      <td className="text-right font-mono">{c.dte}</td>
                      <td className="text-right font-mono">{fmtCur(m.capitalAtRisk)}</td>
                      <td className="text-right font-mono">{fmtPct(m.downsideCushion)}</td>
                      <td className="text-right font-mono">{fmtPct(m.absROC)}</td>
                      <td className="text-right font-mono">
                        {fmtPct(m.annROC)}
                        {m.annROC === best && m.annROC > 0 && <Badge variant="secondary" className="ml-1 text-[9px]">BEST</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ===== CONDOR TAB ===== */}
        <TabsContent value="condor" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select value={condorSort} onValueChange={(v) => setCondorSort(v as CondorSort)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annROC">Best Ann. ROC</SelectItem>
                <SelectItem value="riskReward">Best Risk/Reward</SelectItem>
                <SelectItem value="tentWidth">Widest Tent</SelectItem>
                <SelectItem value="premiumRisk">Best Premium/Risk</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={addCondorCandidate} disabled={condorCandidates.length >= 4}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>

          {/* Input cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {condorCandidates.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Candidate {c.ticker || "#"}</CardTitle>
                  {condorCandidates.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCondorCandidates((prev) => prev.filter((x) => x.id !== c.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {([
                    ["ticker", "Ticker", "text"],
                    ["currentPrice", "Current Price", "number"],
                    ["shortPut", "Short Put", "number"],
                    ["longPut", "Long Put", "number"],
                    ["shortCall", "Short Call", "number"],
                    ["longCall", "Long Call", "number"],
                    ["premium", "Net Premium/Share", "number"],
                    ["dte", "DTE", "number"],
                    ["contracts", "Contracts", "number"],
                    ["multiplier", "Multiplier", "number"],
                  ] as [keyof CondorCandidate, string, string][]).map(([field, label, type]) => (
                    <div key={field}>
                      <Label className="text-[10px] text-muted-foreground">{label}</Label>
                      <Input
                        type={type}
                        value={c[field]}
                        onChange={(e) => updateCondor(c.id, field, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Results table */}
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Net Premium</th>
                  <th className="text-right">Max Profit</th>
                  <th className="text-right">Max Risk</th>
                  <th className="text-right">R:R</th>
                  <th className="text-right">Lower BE</th>
                  <th className="text-right">Upper BE</th>
                  <th className="text-right">Tent Width</th>
                  <th className="text-right">ROC</th>
                  <th className="text-right">Ann. ROC</th>
                </tr>
              </thead>
              <tbody>
                {sortedCondors.map((c) => {
                  const m = calcCondorMetrics(c);
                  return (
                    <tr key={c.id}>
                      <td className="text-foreground font-medium">{c.ticker || "—"}</td>
                      <td className="text-right font-mono">{fmtCur(c.currentPrice)}</td>
                      <td className="text-right font-mono">{fmtCur(c.premium)}</td>
                      <td className="text-right font-mono text-success">{fmtCur(m.maxProfit)}</td>
                      <td className="text-right font-mono text-destructive">{fmtCur(m.maxRisk)}</td>
                      <td className="text-right font-mono">{m.riskReward.toFixed(2)}</td>
                      <td className="text-right font-mono">{fmtCur(m.lowerBE)}</td>
                      <td className="text-right font-mono">{fmtCur(m.upperBE)}</td>
                      <td className="text-right font-mono">{fmtCur(m.tentWidth)}</td>
                      <td className="text-right font-mono">{fmtPct(m.absROC)}</td>
                      <td className="text-right font-mono">{fmtPct(m.annROC)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
