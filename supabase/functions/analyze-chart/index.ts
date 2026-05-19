import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STRATEGY_PROMPTS: Record<string, string> = {
  scalping: `You are a SCALPER. Focus on 1m-15m structure: liquidity sweeps, micro order blocks, fair value gaps, session opens (London/NY). Target 5-20 pip moves with tight 1:1.5 to 1:3 RR. Be decisive on short-term momentum.`,
  intraday: `You are an INTRADAY trader. Focus on H1-H4 structure: daily/weekly highs & lows, key supply/demand zones, session bias, news catalysts. Target 30-100 pip moves with 1:2 to 1:4 RR.`,
  swing: `You are a SWING trader. Focus on H4-D1-W1 structure: Wyckoff phases, accumulation/distribution, weekly imbalance, macro narrative. Target 150-500 pip moves with 1:3 to 1:6 RR.`,
  smc: `You are a Smart Money Concepts (SMC) analyst. Identify BOS/CHoCH, order blocks, fair value gaps, liquidity grabs, premium/discount zones. Entries must be at refined POIs after a liquidity sweep.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { imageBase64, mimeType, pair, timeframe, notes, currentPrice, strategy } = await req.json();

    if (!imageBase64) throw new Error("No chart image provided");

    const strategyKey = (strategy || "intraday").toLowerCase();
    const strategyDirective = STRATEGY_PROMPTS[strategyKey] || STRATEGY_PROMPTS.intraday;

    const systemPrompt = `You are a senior institutional chart analyst for Midnight Panda. Today: ${new Date().toUTCString()}.
${strategyDirective}

You MUST follow a strict Chain-of-Thought before producing the signal:
STEP 1 — TREND: Identify primary trend (HTF bias) and secondary trend (LTF pullback/continuation).
STEP 2 — KEY LEVELS: Map the nearest major support & resistance, supply/demand zones, swing highs/lows, and any unfilled liquidity pools.
STEP 3 — INDICATORS / PRICE ACTION: Read any visible RSI, MACD, MAs, volume. Note candle structure, rejection wicks, engulfings, BOS/CHoCH.
STEP 4 — CONFLUENCE CHECK: Count confluences (trend + level + indicator + structure + session). 4+ confluences = high confidence. <3 = low.
STEP 5 — SIGNAL: Only now produce Entry, SL, TP with EXACT prices grounded in the provided current price.

CONFIDENCE RULES:
- 85-95: 4+ confluences, clean structure, clear bias.
- 70-84: 3 confluences, some ambiguity.
- Below 70: Mark as LOW RELIABILITY and set sentiment to NEUTRAL with a warning telling the user to skip this setup.

PRICE GROUNDING: Use the provided "Current Market Price" as the anchor for Entry/SL/TP. Do NOT invent price levels far from it. SL and TP must be realistic pip distances for the timeframe.

Respond with valid JSON only, no markdown.`;

    const userPrompt = `Analyze this chart.

Pair: ${pair || "(identify from chart)"}
Timeframe: ${timeframe || "(identify from chart)"}
Current Market Price: ${currentPrice || "(estimate from latest candle on chart)"}
Strategy Mode: ${strategyKey.toUpperCase()}
Trader notes: ${notes || "none"}

Walk through Steps 1-5 internally, then output ONLY this JSON:
{
  "asset": "string",
  "timeframe": "string",
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": number (0-100),
  "reliability": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": {
    "trend": "primary + secondary trend",
    "keyLevels": "nearest S/R, zones, liquidity",
    "indicators": "RSI/MACD/MA/structure readings",
    "confluences": ["confluence 1", "confluence 2", "..."]
  },
  "summary": "2-3 sentence verdict",
  "patterns": ["pattern names"],
  "entry": { "price": "exact price string", "reason": "why here" },
  "stopLoss": { "price": "exact price string", "reason": "why here" },
  "takeProfit": { "price": "exact price string", "reason": "why here" },
  "riskReward": "1:X.X",
  "keyLevels": ["price1", "price2"],
  "indicators": ["RSI 62 bullish", "MACD cross up"],
  "warning": "risk note OR low-reliability warning"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
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

    // Server-side confidence guard
    if (typeof analysis.confidence === "number" && analysis.confidence < 70) {
      analysis.reliability = "LOW";
      analysis.warning = `⚠️ LOW RELIABILITY (${analysis.confidence}%). ${analysis.warning || "Skip this setup — wait for cleaner structure."}`;
    } else if (!analysis.reliability) {
      analysis.reliability = analysis.confidence >= 85 ? "HIGH" : "MEDIUM";
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
