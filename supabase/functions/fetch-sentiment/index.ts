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
    const prompt = `You are a financial market sentiment analyst. Today is ${now.toISOString().split('T')[0]}.

Generate current market sentiment data for major trading instruments. Return ONLY valid JSON, no markdown:
{
  "sentiments": [
    {
      "asset": "EUR/USD",
      "category": "FOREX",
      "sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
      "score": number 0-100 (0=extreme bearish, 50=neutral, 100=extreme bullish),
      "change": "+2.5" or "-1.3" (change from yesterday),
      "drivers": ["key driver 1", "key driver 2"]
    }
  ]
}

Include these assets:
FOREX: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, NZD/USD, USD/CHF, EUR/GBP
CRYPTO: BTC/USD, ETH/USD, SOL/USD, XRP/USD
COMMODITIES: XAU/USD (Gold), XAG/USD (Silver), WTI Oil, Brent Oil
INDICES: US30, NAS100, SPX500, GER40, UK100, JPN225

Base sentiment on current macro conditions, recent price action, and institutional positioning. Be realistic.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a market sentiment data provider. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Sentiment data unavailable" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse sentiment data:", content);
      return new Response(JSON.stringify({ error: "Failed to parse sentiment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-sentiment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
