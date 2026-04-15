// Business logic calculations for wheel trades, campaigns, and condors

export interface WheelTradeRow {
  id: string;
  trade_date: string;
  underlying: string;
  trade_type: string;
  contracts: number;
  strike: number;
  expiration_date: string;
  premium_per_share: number;
  status: string;
  close_date: string | null;
  premium_paid_to_close: number | null;
  currency: string;
  multiplier: number;
  stock_cost_basis: number | null;
  campaign_id: string | null;
  delta_at_entry: number | null;
}

export interface CondorTradeRow {
  id: string;
  trade_date: string;
  underlying: string;
  contracts: number;
  expiration_date: string;
  short_call_strike: number;
  long_call_strike: number;
  short_put_strike: number;
  long_put_strike: number;
  premium_per_share: number;
  status: string;
  close_date: string | null;
  premium_paid_to_close: number | null;
  multiplier: number;
}

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

export function calcDaysInTrade(trade: { trade_date: string; close_date: string | null; status: string }): number {
  const end = trade.close_date && trade.status !== 'Open' ? trade.close_date : new Date().toISOString().slice(0, 10);
  return daysBetween(trade.trade_date, end);
}

export function calcDaysToExpiry(expiration_date: string): number {
  return Math.max(0, daysBetween(new Date().toISOString().slice(0, 10), expiration_date));
}

export function calcCapitalAtRisk(trade: WheelTradeRow): number {
  if (trade.trade_type === 'CSP') {
    return trade.strike * trade.contracts * trade.multiplier;
  }
  // CC: use stock cost basis if available, else strike * contracts * multiplier
  const basis = trade.stock_cost_basis ?? trade.strike;
  return basis * trade.contracts * trade.multiplier;
}

export function calcTotalPremium(trade: WheelTradeRow): number {
  return (trade.premium_per_share - (trade.premium_paid_to_close ?? 0)) * trade.contracts * trade.multiplier;
}

export function calcFees(contracts: number, feePerContract: number, legs: number = 1): number {
  return feePerContract * contracts * legs;
}

export function calcNetCredit(trade: WheelTradeRow, feePerContract: number): number {
  return calcTotalPremium(trade) - calcFees(trade.contracts, feePerContract);
}

export function calcNetPL(trade: WheelTradeRow, feePerContract: number, stockPL: number = 0): number {
  return calcNetCredit(trade, feePerContract) + stockPL;
}

export function calcTradeROC(netPL: number, capitalAtRisk: number): number {
  if (capitalAtRisk === 0) return 0;
  return netPL / capitalAtRisk;
}

export function calcAnnualizedROC(roc: number, daysInTrade: number): number {
  if (daysInTrade <= 0) return 0;
  return roc * (365 / daysInTrade);
}

export function calcEstimatedTax(netPL: number, taxRate: number): number {
  return netPL > 0 ? netPL * taxRate : 0;
}

export function calcPostTaxPL(netPL: number, taxRate: number): number {
  return netPL - calcEstimatedTax(netPL, taxRate);
}

// Condor calculations
export function calcCondorCapitalAtRisk(trade: CondorTradeRow): number {
  const callSpread = Math.abs(trade.long_call_strike - trade.short_call_strike);
  const putSpread = Math.abs(trade.short_put_strike - trade.long_put_strike);
  const maxSpread = Math.max(callSpread, putSpread);
  const premiumCredit = trade.premium_per_share;
  return Math.max(0, (maxSpread - premiumCredit) * trade.contracts * trade.multiplier);
}

export function calcCondorMaxProfit(trade: CondorTradeRow): number {
  return trade.premium_per_share * trade.contracts * trade.multiplier;
}

export function calcCondorBreakevens(trade: CondorTradeRow): { upper: number; lower: number } {
  return {
    upper: trade.short_call_strike + trade.premium_per_share,
    lower: trade.short_put_strike - trade.premium_per_share,
  };
}

// Campaign aggregation
export function calcCampaignMetrics(trades: WheelTradeRow[], feePerContract: number, taxRate: number) {
  if (trades.length === 0) return null;

  let totalGrossPremium = 0;
  let totalFees = 0;
  let maxCapital = 0;
  let totalNetPL = 0;

  trades.forEach(t => {
    const gross = t.premium_per_share * t.contracts * t.multiplier;
    totalGrossPremium += gross;
    const fees = calcFees(t.contracts, feePerContract);
    totalFees += fees;
    const netPL = calcNetPL(t, feePerContract);
    totalNetPL += netPL;
    const car = calcCapitalAtRisk(t);
    if (car > maxCapital) maxCapital = car;
  });

  const firstDate = trades.reduce((min, t) => t.trade_date < min ? t.trade_date : min, trades[0].trade_date);
  const lastDate = trades.reduce((max, t) => {
    const d = t.close_date || t.trade_date;
    return d > max ? d : max;
  }, trades[0].trade_date);
  const totalDays = daysBetween(firstDate, lastDate) || 1;
  const roc = calcTradeROC(totalNetPL, maxCapital);
  const annROC = calcAnnualizedROC(roc, totalDays);

  return {
    netPL: totalNetPL,
    grossPremium: totalGrossPremium,
    totalFees,
    maxCapital,
    totalDays,
    roc,
    annualizedROC: annROC,
    rollCount: Math.max(0, trades.length - 1),
    tradeCount: trades.length,
    postTaxPL: calcPostTaxPL(totalNetPL, taxRate),
  };
}

// Dashboard aggregation helpers
export function calcDashboardKPIs(trades: WheelTradeRow[], feePerContract: number, taxRate: number) {
  const closed = trades.filter(t => t.status !== 'Open');
  const open = trades.filter(t => t.status === 'Open');

  let totalRealizedPL = 0;
  let totalGrossPremium = 0;
  let totalFees = 0;
  let wins = 0;
  let losses = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;
  let totalROC = 0;
  let totalAnnROC = 0;
  let totalWeightedROC = 0;
  let totalWeightedAnnROC = 0;
  let totalCapitalWeighted = 0;

  closed.forEach(t => {
    const netPL = calcNetPL(t, feePerContract);
    const car = calcCapitalAtRisk(t);
    totalRealizedPL += netPL;
    totalGrossPremium += t.premium_per_share * t.contracts * t.multiplier;
    totalFees += calcFees(t.contracts, feePerContract);
    const roc = calcTradeROC(netPL, car);
    const dit = calcDaysInTrade(t);
    const annRoc = calcAnnualizedROC(roc, dit);
    totalWeightedROC += roc * car;
    totalWeightedAnnROC += annRoc * car;
    totalCapitalWeighted += car;
    if (netPL >= 0) { wins++; totalWinAmount += netPL; }
    else { losses++; totalLossAmount += Math.abs(netPL); }
  });

  const avgGain = wins > 0 ? totalWinAmount / wins : 0;
  const avgLoss = losses > 0 ? totalLossAmount / losses : 0;
  const winRate = closed.length > 0 ? wins / closed.length : 0;
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? Infinity : 0;
  const expectancy = closed.length > 0 ? totalRealizedPL / closed.length : 0;
  const weightedROC = totalCapitalWeighted > 0 ? totalWeightedROC / totalCapitalWeighted : 0;
  const weightedAnnROC = totalCapitalWeighted > 0 ? totalWeightedAnnROC / totalCapitalWeighted : 0;

  let cspCapital = 0;
  let ccCapital = 0;
  open.forEach(t => {
    const car = calcCapitalAtRisk(t);
    if (t.trade_type === 'CSP') cspCapital += car;
    else ccCapital += car;
  });

  const upcomingExpirations = open.filter(t => calcDaysToExpiry(t.expiration_date) <= 14).length;

  return {
    totalRealizedPL,
    totalGrossPremium,
    totalFees,
    closedCount: closed.length,
    wins,
    losses,
    winRate,
    avgGain,
    avgLoss,
    profitFactor,
    expectancy,
    weightedROC,
    weightedAnnROC,
    cspCapital,
    ccCapital,
    upcomingExpirations,
    openCount: open.length,
  };
}

export function calcMonthlyMetrics(trades: WheelTradeRow[], feePerContract: number) {
  const months: Record<string, WheelTradeRow[]> = {};
  trades.filter(t => t.status !== 'Open').forEach(t => {
    const d = t.close_date || t.trade_date;
    const m = d.slice(0, 7);
    if (!months[m]) months[m] = [];
    months[m].push(t);
  });

  return Object.entries(months)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, mTrades]) => {
      let realizedPL = 0;
      let grossPremium = 0;
      let wins = 0;
      let totalWeightedROC = 0;
      let totalWeightedAnnROC = 0;
      let totalCap = 0;
      let minDelta = Infinity;
      let maxDelta = -Infinity;

      mTrades.forEach(t => {
        const netPL = calcNetPL(t, feePerContract);
        const car = calcCapitalAtRisk(t);
        const roc = calcTradeROC(netPL, car);
        const dit = calcDaysInTrade(t);
        const annRoc = calcAnnualizedROC(roc, dit);
        realizedPL += netPL;
        grossPremium += t.premium_per_share * t.contracts * t.multiplier;
        if (netPL >= 0) wins++;
        totalWeightedROC += roc * car;
        totalWeightedAnnROC += annRoc * car;
        totalCap += car;
        if (t.delta_at_entry != null) {
          const d = Math.abs(t.delta_at_entry);
          if (d < minDelta) minDelta = d;
          if (d > maxDelta) maxDelta = d;
        }
      });

      return {
        month,
        realizedPL,
        grossPremium,
        tradesClosed: mTrades.length,
        winRate: mTrades.length > 0 ? wins / mTrades.length : 0,
        weightedROC: totalCap > 0 ? totalWeightedROC / totalCap : 0,
        weightedAnnROC: totalCap > 0 ? totalWeightedAnnROC / totalCap : 0,
        safestDelta: minDelta === Infinity ? null : minDelta,
        riskiestDelta: maxDelta === -Infinity ? null : maxDelta,
      };
    });
}
