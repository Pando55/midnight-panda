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

    const { imageBase64, mimeType, pair, timeframe, notes } = await req.json();

    if (!imageBase64) throw new Error("No chart image provided");

    const prompt = `You are a senior multi-timeframe technical analyst for a trading signals app called Midnight Panda. Analyze this chart image with STRICT top-down (HTF -> LTF) confluence logic.

${pair ? `Currency Pair / Asset: ${pair}` : "Identify the asset from the chart if possible."}
${timeframe ? `Timeframe shown: ${timeframe}` : "Identify the timeframe shown."}
${notes ? `Trader's Notes: ${notes}` : ""}

CRITICAL RULES — multi-timeframe alignment (do this even if only ONE chart is uploaded):
1. Identify the timeframe shown (LTF). Then INFER the higher timeframes you would need to confirm the trade:
   - M1 -> must align with M5, M15 and H1 bias
   - M5 -> must align with M15, H1, H4 bias
   - M15 -> must align with H1, H4 bias
   - H1 -> must align with H4, D1 bias
   - H4 -> must align with D1, W1 bias
   - D1 -> must align with W1, MN bias
2. From the visible price action, structure, swing points and any indicators in the image, REASON about what the inferred HTF bias most likely is (bullish / bearish / ranging) based on:
   - the position of price relative to recent swing highs/lows
   - the slope and structure of the visible trend
   - liquidity zones, order blocks, FVGs, premium/discount zones
   - Wyckoff phase if identifiable
3. Only give a BULLISH or BEARISH signal if the LTF setup ALIGNS with the inferred HTF bias. If it conflicts, the sentiment MUST be NEUTRAL and the warning MUST explain the HTF/LTF conflict.
4. Entry, SL and TP must respect HTF structure (e.g. SL beyond HTF swing, TP at HTF liquidity / opposing zone).

Provide analysis in this EXACT JSON format (no markdown, raw JSON only):
{
  "asset": "identified or provided asset name",
  "timeframe": "identified or provided timeframe (LTF shown)",
  "sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "confidence": number between 60-95,
  "summary": "2-3 sentence overview tying LTF setup to inferred HTF bias",
  "patterns": ["list of chart patterns identified e.g. Double Bottom, Order Block, FVG"],
  "timeframeAlignment": {
    "ltf": "the timeframe shown",
    "htfBias": "BULLISH" or "BEARISH" or "RANGING",
    "htfReasoning": "1-2 sentences explaining the inferred higher-timeframe bias from what is visible",
    "aligned": true or false,
    "checkedTimeframes": ["list the HTFs you reasoned against, e.g. M15, H1, H4"]
  },
  "entry": { "price": "suggested entry price as string", "reason": "Why enter here, referencing HTF + LTF confluence" },
  "stopLoss": { "price": "stop loss price as string", "reason": "Why SL here, tied to HTF/LTF structure" },
  "takeProfit": { "price": "take profit price as string", "reason": "Why this target, referencing HTF liquidity / level" },
  "riskReward": "risk to reward ratio like 1:2.5",
  "keyLevels": ["important price levels"],
  "indicators": ["visible indicators and readings"],
  "warning": "risk factors — MUST mention HTF/LTF conflict if aligned=false"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional chart analyst. Analyze chart images with precision. Always respond with valid JSON only." },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Chart analysis unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let analysis;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse chart analysis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-chart error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
