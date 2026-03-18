import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Provider = "ecb" | "fred" | "alpha_vantage" | "eodhd" | "sec_edgar";

// ECB exchange rates
async function fetchECB(params: Record<string, string>) {
  const { base = "USD", currencies } = params;
  const url = "https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A?lastNObservations=30&format=jsondata";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`ECB API error: ${res.status}`);
  const data = await res.json();
  
  // Parse ECB SDMX-JSON structure
  const dataSets = data?.dataSets?.[0]?.series || {};
  const timePeriods = data?.structure?.dimensions?.observation?.[0]?.values || [];
  const currencyDim = data?.structure?.dimensions?.series?.find((d: any) => d.id === "CURRENCY")?.values || [];
  
  const rates: Record<string, Record<string, number>> = {};
  for (const [seriesKey, seriesData] of Object.entries(dataSets)) {
    const keyParts = seriesKey.split(":");
    const currencyIdx = parseInt(keyParts[1] || "0");
    const currency = currencyDim[currencyIdx]?.id || "UNKNOWN";
    const obs = (seriesData as any).observations || {};
    for (const [obsKey, obsValue] of Object.entries(obs)) {
      const period = timePeriods[parseInt(obsKey)]?.id || obsKey;
      if (!rates[period]) rates[period] = {};
      rates[period][currency] = (obsValue as number[])[0];
    }
  }
  
  return { provider: "ecb", type: "fx_rates", base: "EUR", data: rates };
}

// FRED economic data
async function fetchFRED(params: Record<string, string>) {
  const apiKey = Deno.env.get("FRED_API_KEY");
  if (!apiKey) throw new Error("FRED_API_KEY not configured");
  
  const { series_id = "DFF", limit = "365" } = params;
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED API error: ${res.status}`);
  const data = await res.json();
  
  return {
    provider: "fred",
    type: "economic_series",
    series_id,
    observations: (data.observations || []).map((o: any) => ({
      date: o.date,
      value: o.value === "." ? null : parseFloat(o.value),
    })),
  };
}

// Alpha Vantage
async function fetchAlphaVantage(params: Record<string, string>) {
  const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  if (!apiKey) throw new Error("ALPHA_VANTAGE_API_KEY not configured");
  
  const { fn = "TIME_SERIES_DAILY_ADJUSTED", symbol } = params;
  if (!symbol) throw new Error("symbol is required");
  
  const url = `https://www.alphavantage.co/query?function=${fn}&symbol=${symbol}&apikey=${apiKey}&outputsize=compact`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage API error: ${res.status}`);
  const data = await res.json();
  
  if (data["Note"] || data["Information"]) {
    throw new Error(`Alpha Vantage rate limit: ${data["Note"] || data["Information"]}`);
  }
  
  // Handle different function types
  if (fn === "OVERVIEW") {
    return { provider: "alpha_vantage", type: "company_overview", symbol, data };
  }
  
  const tsKey = Object.keys(data).find((k) => k.includes("Time Series")) || "";
  const ts = data[tsKey] || {};
  const prices = Object.entries(ts).slice(0, 100).map(([date, vals]: [string, any]) => ({
    date,
    open: parseFloat(vals["1. open"]),
    high: parseFloat(vals["2. high"]),
    low: parseFloat(vals["3. low"]),
    close: parseFloat(vals["4. close"]),
    adjusted_close: parseFloat(vals["5. adjusted close"] || vals["4. close"]),
    volume: parseInt(vals["6. volume"] || vals["5. volume"] || "0"),
    dividend: parseFloat(vals["7. dividend amount"] || "0"),
  }));
  
  return { provider: "alpha_vantage", type: "daily_prices", symbol, data: prices };
}

// EODHD
async function fetchEODHD(params: Record<string, string>) {
  const apiKey = Deno.env.get("EODHD_API_KEY");
  if (!apiKey) throw new Error("EODHD_API_KEY not configured");
  
  const { symbol, endpoint = "eod", period = "d" } = params;
  if (!symbol) throw new Error("symbol is required");
  
  let url: string;
  if (endpoint === "fundamentals") {
    url = `https://eodhd.com/api/fundamentals/${symbol}?api_token=${apiKey}&fmt=json`;
  } else if (endpoint === "dividends") {
    url = `https://eodhd.com/api/div/${symbol}?api_token=${apiKey}&fmt=json&from=2020-01-01`;
  } else {
    url = `https://eodhd.com/api/${endpoint}/${symbol}?api_token=${apiKey}&fmt=json&period=${period}&order=d&limit=365`;
  }
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`EODHD API error: ${res.status}`);
  const data = await res.json();
  
  return { provider: "eodhd", type: endpoint, symbol, data: Array.isArray(data) ? data.slice(0, 365) : data };
}

// SEC EDGAR
async function fetchSECEdgar(params: Record<string, string>) {
  const { cik, ticker } = params;
  
  // Resolve CIK from ticker if needed
  let resolvedCik = cik;
  if (!resolvedCik && ticker) {
    const tickerRes = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: { "User-Agent": "NeuroQuant/1.0 admin@neuroquant.io" },
    });
    if (tickerRes.ok) {
      const tickers = await tickerRes.json();
      const match = Object.values(tickers).find((t: any) => t.ticker?.toUpperCase() === ticker.toUpperCase()) as any;
      if (match) resolvedCik = String(match.cik_str).padStart(10, "0");
    }
  }
  
  if (!resolvedCik) throw new Error("CIK or ticker is required");
  
  const paddedCik = resolvedCik.padStart(10, "0");
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "NeuroQuant/1.0 admin@neuroquant.io" },
  });
  if (!res.ok) throw new Error(`SEC EDGAR API error: ${res.status}`);
  const data = await res.json();
  
  // Return summary
  return {
    provider: "sec_edgar",
    type: "company_facts",
    cik: resolvedCik,
    entityName: data.entityName,
    factCount: Object.keys(data.facts?.["us-gaap"] || {}).length,
    recentFacts: Object.entries(data.facts?.["us-gaap"] || {}).slice(0, 20).map(([key, val]: [string, any]) => ({
      fact: key,
      label: val.label,
      unitCount: Object.keys(val.units || {}).length,
    })),
  };
}

const PROVIDERS: Record<Provider, (params: Record<string, string>) => Promise<unknown>> = {
  ecb: fetchECB,
  fred: fetchFRED,
  alpha_vantage: fetchAlphaVantage,
  eodhd: fetchEODHD,
  sec_edgar: fetchSECEdgar,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { provider, params } = await req.json() as { provider: Provider; params: Record<string, string> };
    
    if (!provider || !PROVIDERS[provider]) {
      return jsonResponse({ success: false, error: `Unknown provider: ${provider}. Supported: ${Object.keys(PROVIDERS).join(", ")}` }, 400);
    }
    
    const data = await PROVIDERS[provider](params || {});
    return jsonResponse({ success: true, ...data as Record<string, unknown> });
  } catch (err) {
    return jsonResponse({ success: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
