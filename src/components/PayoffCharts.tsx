import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ---- Data generation helpers ----

interface PayoffPoint {
  price: number;
  payoff: number;
}

function generatePriceRange(center: number, width: number = 0.4, steps: number = 200): number[] {
  const lo = center * (1 - width);
  const hi = center * (1 + width);
  const step = (hi - lo) / steps;
  return Array.from({ length: steps + 1 }, (_, i) => +(lo + i * step).toFixed(4));
}

// ---- CSP Payoff ----

export function cspPayoff(
  strike: number, premium: number, contracts: number, multiplier: number
): PayoffPoint[] {
  const prices = generatePriceRange(strike);
  return prices.map((price) => {
    const intrinsic = Math.max(strike - price, 0);
    const payoff = (premium - intrinsic) * contracts * multiplier;
    return { price, payoff };
  });
}

// ---- CC Payoff ----

export function ccPayoff(
  strike: number, premium: number, costBasis: number, contracts: number, multiplier: number
): PayoffPoint[] {
  const prices = generatePriceRange(strike);
  return prices.map((price) => {
    const stockPL = price - costBasis;
    const optionPL = price >= strike ? premium - (price - strike) : premium;
    const payoff = (stockPL + optionPL) * contracts * multiplier;
    return { price, payoff };
  });
}

// ---- Iron Condor Payoff ----

export function condorPayoff(
  shortPut: number, longPut: number, shortCall: number, longCall: number,
  premium: number, contracts: number, multiplier: number
): PayoffPoint[] {
  const center = (shortPut + shortCall) / 2;
  const prices = generatePriceRange(center, 0.5);
  return prices.map((price) => {
    let pl = premium;
    // Put side
    if (price < shortPut) {
      const putLoss = Math.min(shortPut - price, shortPut - longPut);
      pl -= putLoss;
    }
    // Call side
    if (price > shortCall) {
      const callLoss = Math.min(price - shortCall, longCall - shortCall);
      pl -= callLoss;
    }
    return { price, payoff: pl * contracts * multiplier };
  });
}

// ---- Chart Components ----

interface PayoffChartProps {
  data: PayoffPoint[];
  title: string;
  strikes?: { label: string; value: number }[];
  currentPrice?: number;
  breakevens?: number[];
  height?: number;
}

export function PayoffChart({ data, title, strikes = [], currentPrice, breakevens = [], height = 300 }: PayoffChartProps) {
  const maxProfit = useMemo(() => Math.max(...data.map((d) => d.payoff)), [data]);
  const maxLoss = useMemo(() => Math.min(...data.map((d) => d.payoff)), [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>Max Profit: €{maxProfit.toFixed(0)}</span>
          <span>Max Loss: €{maxLoss.toFixed(0)}</span>
          {breakevens.map((be, i) => <span key={i}>BE: €{be.toFixed(2)}</span>)}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="price"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => `€${v.toFixed(0)}`}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tickFormatter={(v: number) => `€${v.toFixed(0)}`}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              formatter={(v: number) => [`€${v.toFixed(2)}`, "P/L"]}
              labelFormatter={(v: number) => `Price: €${Number(v).toFixed(2)}`}
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            {strikes.map((s, i) => (
              <ReferenceLine key={i} x={s.value} stroke="hsl(var(--primary))" strokeDasharray="4 2" label={{ value: s.label, fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            ))}
            {currentPrice != null && (
              <ReferenceLine x={currentPrice} stroke="hsl(var(--foreground))" strokeWidth={1.5} label={{ value: "Current", fontSize: 9, fill: "hsl(var(--foreground))" }} />
            )}
            {breakevens.map((be, i) => (
              <ReferenceLine key={`be-${i}`} x={be} stroke="hsl(var(--destructive))" strokeDasharray="2 2" label={{ value: "BE", fontSize: 9, fill: "hsl(var(--destructive))" }} />
            ))}
            <Area
              type="monotone"
              dataKey="payoff"
              stroke="hsl(var(--primary))"
              fill="url(#profitGrad)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Convenience wrappers

export function CSPPayoffChart({ strike, premium, contracts, multiplier, currentPrice }: {
  strike: number; premium: number; contracts: number; multiplier: number; currentPrice?: number;
}) {
  const data = useMemo(() => cspPayoff(strike, premium, contracts, multiplier), [strike, premium, contracts, multiplier]);
  const be = strike - premium;
  return (
    <PayoffChart
      data={data}
      title="CSP Payoff"
      strikes={[{ label: `Strike ${strike}`, value: strike }]}
      currentPrice={currentPrice}
      breakevens={[be]}
    />
  );
}

export function CCPayoffChart({ strike, premium, costBasis, contracts, multiplier, currentPrice }: {
  strike: number; premium: number; costBasis: number; contracts: number; multiplier: number; currentPrice?: number;
}) {
  const data = useMemo(() => ccPayoff(strike, premium, costBasis, contracts, multiplier), [strike, premium, costBasis, contracts, multiplier]);
  const be = costBasis - premium;
  return (
    <PayoffChart
      data={data}
      title="CC Payoff"
      strikes={[{ label: `Strike ${strike}`, value: strike }, { label: `Basis ${costBasis}`, value: costBasis }]}
      currentPrice={currentPrice}
      breakevens={[be]}
    />
  );
}

export function CondorPayoffChart({ shortPut, longPut, shortCall, longCall, premium, contracts, multiplier, currentPrice }: {
  shortPut: number; longPut: number; shortCall: number; longCall: number;
  premium: number; contracts: number; multiplier: number; currentPrice?: number;
}) {
  const data = useMemo(() => condorPayoff(shortPut, longPut, shortCall, longCall, premium, contracts, multiplier), [shortPut, longPut, shortCall, longCall, premium, contracts, multiplier]);
  const upperBE = shortCall + premium;
  const lowerBE = shortPut - premium;
  return (
    <PayoffChart
      data={data}
      title="Iron Condor Payoff"
      strikes={[
        { label: `LP ${longPut}`, value: longPut },
        { label: `SP ${shortPut}`, value: shortPut },
        { label: `SC ${shortCall}`, value: shortCall },
        { label: `LC ${longCall}`, value: longCall },
      ]}
      currentPrice={currentPrice}
      breakevens={[lowerBE, upperBE]}
    />
  );
}
