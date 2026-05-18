import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { asset, price, change, changePercent, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const direction = change >= 0 ? "bullish" : "bearish";
    const prompt = `You are an expert forex and financial market analyst for a trading signals app called Midnight Panda. Analyze ${asset} (${category}).

Current Price: ${price}
Change: ${change > 0 ? '+' : ''}${change} (${changePercent > 0 ? '+' : ''}${changePercent}%)
Current Bias: ${direction}

Provide a concise trading analysis in this EXACT JSON format (no markdown, just raw JSON):
{
  "sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "confidence": number between 60-95,
  "summary": "1-2 sentence market overview",
  "entry": {
    "price": suggested entry price as number,
    "reason": "Why enter here (mention key level, pattern, or indicator)"
  },
  "stopLoss": {
    "price": stop loss price as number,
    "reason": "Why place SL here (mention support/resistance)"
  },
  "takeProfit": {
    "price": take profit price as number,
    "reason": "Why target this level"
  },
  "riskReward": "risk to reward ratio like 1:2.5",
  "keyLevels": {
    "support": nearest support price as number,
    "resistance": nearest resistance price as number
  },
  "indicators": ["RSI status", "MACD status", "Moving average status"],
  "timeframe": "recommended timeframe like H4 or D1",
  "warning": "any risk factor or news to watch"
}

Use realistic prices close to the current price. Be specific with technical reasons.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional financial market analyst. Today is "+ new Date().toUTCString() +". Always respond with valid JSON only, no markdown formatting." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from the response, handling potential markdown wrapping
    let analysis;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse analysis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-market error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
