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

    const prompt = `You are a senior technical analyst for a scalping signals app called Midnight Panda. Analyze this chart image and give a fast, decisive signal based on the timeframe shown.

${pair ? `Currency Pair / Asset: ${pair}` : "Identify the asset from the chart if possible."}
${timeframe ? `Timeframe shown: ${timeframe}` : "Identify the timeframe shown."}
${notes ? `Trader's Notes: ${notes}` : ""}

Read price action, structure, swing points, liquidity zones, order blocks, FVGs, and any visible indicators. Give a clear BULLISH / BEARISH / NEUTRAL call with Entry, SL, and TP based on what is visible on this chart.

Provide analysis in this EXACT JSON format (no markdown, raw JSON only):
{
  "asset": "identified or provided asset name",
  "timeframe": "identified or provided timeframe",
  "sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "confidence": number between 60-95,
  "summary": "2-3 sentence overview of the setup",
  "patterns": ["list of chart patterns identified e.g. Double Bottom, Order Block, FVG"],
  "entry": { "price": "suggested entry price as string", "reason": "Why enter here" },
  "stopLoss": { "price": "stop loss price as string", "reason": "Why SL here" },
  "takeProfit": { "price": "take profit price as string", "reason": "Why this target" },
  "riskReward": "risk to reward ratio like 1:2.5",
  "keyLevels": ["important price levels"],
  "indicators": ["visible indicators and readings"],
  "warning": "risk factors"
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
          { role: "system", content: "You are a professional chart analyst. Today is "+ new Date().toUTCString() +". Analyze chart images with precision. Always respond with valid JSON only." },
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
