import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const now = new Date();
    const prompt = `You are a financial data provider. Return current realistic market prices as of ${now.toISOString()} for these assets. Use your best knowledge of recent market conditions to provide realistic current prices.

Return ONLY valid JSON array, no markdown:
[
  {"symbol":"EUR/USD","name":"Euro / US Dollar","category":"FOREX","price":number,"change":number,"changePercent":number},
  {"symbol":"GBP/USD","name":"British Pound / US Dollar","category":"FOREX","price":number,"change":number,"changePercent":number},
  {"symbol":"USD/JPY","name":"US Dollar / Japanese Yen","category":"FOREX","price":number,"change":number,"changePercent":number},
  {"symbol":"USD/CHF","name":"US Dollar / Swiss Franc","category":"FOREX","price":number,"change":number,"changePercent":number},
  {"symbol":"AUD/USD","name":"Australian Dollar / US Dollar","category":"FOREX","price":number,"change":number,"changePercent":number},
  {"symbol":"USD/CAD","name":"US Dollar / Canadian Dollar","category":"FOREX","price":number,"change":number,"changePercent":number},
  {"symbol":"EUR/GBP","name":"Euro / British Pound","category":"FOREX","price":number,"change":number,"changePercent":number},
  {"symbol":"NZD/USD","name":"New Zealand Dollar / US Dollar","category":"FOREX","price":number,"change":number,"changePercent":number},
  {"symbol":"XAU/USD","name":"Gold / US Dollar","category":"METALS","price":number,"change":number,"changePercent":number},
  {"symbol":"XAG/USD","name":"Silver / US Dollar","category":"METALS","price":number,"change":number,"changePercent":number},
  {"symbol":"US30","name":"Dow Jones Industrial","category":"INDICES","price":number,"change":number,"changePercent":number},
  {"symbol":"US500","name":"S&P 500","category":"INDICES","price":number,"change":number,"changePercent":number},
  {"symbol":"NAS100","name":"NASDAQ 100","category":"INDICES","price":number,"change":number,"changePercent":number},
  {"symbol":"UK100","name":"FTSE 100","category":"INDICES","price":number,"change":number,"changePercent":number},
  {"symbol":"GER40","name":"DAX 40","category":"INDICES","price":number,"change":number,"changePercent":number},
  {"symbol":"WTI","name":"Crude Oil","category":"COMMODITIES","price":number,"change":number,"changePercent":number},
  {"symbol":"BRENT","name":"Brent Oil","category":"COMMODITIES","price":number,"change":number,"changePercent":number},
  {"symbol":"BTC/USD","name":"Bitcoin / US Dollar","category":"CRYPTO","price":number,"change":number,"changePercent":number},
  {"symbol":"ETH/USD","name":"Ethereum / US Dollar","category":"CRYPTO","price":number,"change":number,"changePercent":number}
]

change = daily price change in points. changePercent = daily percentage change. Use realistic values based on current market conditions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a financial data provider. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Market data unavailable" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const marketData = parseMarketJSON(content) ?? FALLBACK_MARKET_DATA;

    return new Response(JSON.stringify({ data: marketData, timestamp: now.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-market-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
