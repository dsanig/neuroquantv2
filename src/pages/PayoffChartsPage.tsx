import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CSPPayoffChart, CCPayoffChart, CondorPayoffChart } from "@/components/PayoffCharts";

export default function PayoffChartsPage() {
  // CSP state
  const [cspStrike, setCspStrike] = useState(100);
  const [cspPremium, setCspPremium] = useState(2.5);
  const [cspContracts, setCspContracts] = useState(1);
  const [cspMultiplier, setCspMultiplier] = useState(100);
  const [cspPrice, setCspPrice] = useState(105);

  // CC state
  const [ccStrike, setCcStrike] = useState(110);
  const [ccPremium, setCcPremium] = useState(3);
  const [ccBasis, setCcBasis] = useState(100);
  const [ccContracts, setCcContracts] = useState(1);
  const [ccMultiplier, setCcMultiplier] = useState(100);
  const [ccPrice, setCcPrice] = useState(105);

  // Condor state
  const [icSP, setIcSP] = useState(90);
  const [icLP, setIcLP] = useState(85);
  const [icSC, setIcSC] = useState(110);
  const [icLC, setIcLC] = useState(115);
  const [icPremium, setIcPremium] = useState(2);
  const [icContracts, setIcContracts] = useState(1);
  const [icMultiplier, setIcMultiplier] = useState(100);
  const [icPrice, setIcPrice] = useState(100);

  const numField = (label: string, value: number, setter: (v: number) => void) => (
    <div>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input type="number" value={value} onChange={(e) => setter(parseFloat(e.target.value) || 0)} className="h-7 text-xs font-mono" />
    </div>
  );

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Payoff Charts</h1>
      </div>

      <Tabs defaultValue="csp">
        <TabsList>
          <TabsTrigger value="csp">Cash-Secured Put</TabsTrigger>
          <TabsTrigger value="cc">Covered Call</TabsTrigger>
          <TabsTrigger value="condor">Iron Condor</TabsTrigger>
        </TabsList>

        <TabsContent value="csp" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Parameters</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {numField("Strike", cspStrike, setCspStrike)}
                {numField("Premium/Share", cspPremium, setCspPremium)}
                {numField("Contracts", cspContracts, setCspContracts)}
                {numField("Multiplier", cspMultiplier, setCspMultiplier)}
                {numField("Current Price", cspPrice, setCspPrice)}
              </div>
            </CardContent>
          </Card>
          <CSPPayoffChart strike={cspStrike} premium={cspPremium} contracts={cspContracts} multiplier={cspMultiplier} currentPrice={cspPrice} />
        </TabsContent>

        <TabsContent value="cc" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Parameters</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {numField("Strike", ccStrike, setCcStrike)}
                {numField("Premium/Share", ccPremium, setCcPremium)}
                {numField("Cost Basis", ccBasis, setCcBasis)}
                {numField("Contracts", ccContracts, setCcContracts)}
                {numField("Multiplier", ccMultiplier, setCcMultiplier)}
                {numField("Current Price", ccPrice, setCcPrice)}
              </div>
            </CardContent>
          </Card>
          <CCPayoffChart strike={ccStrike} premium={ccPremium} costBasis={ccBasis} contracts={ccContracts} multiplier={ccMultiplier} currentPrice={ccPrice} />
        </TabsContent>

        <TabsContent value="condor" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Parameters</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {numField("Long Put", icLP, setIcLP)}
                {numField("Short Put", icSP, setIcSP)}
                {numField("Short Call", icSC, setIcSC)}
                {numField("Long Call", icLC, setIcLC)}
                {numField("Net Premium/Share", icPremium, setIcPremium)}
                {numField("Contracts", icContracts, setIcContracts)}
                {numField("Multiplier", icMultiplier, setIcMultiplier)}
                {numField("Current Price", icPrice, setIcPrice)}
              </div>
            </CardContent>
          </Card>
          <CondorPayoffChart shortPut={icSP} longPut={icLP} shortCall={icSC} longCall={icLC} premium={icPremium} contracts={icContracts} multiplier={icMultiplier} currentPrice={icPrice} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
