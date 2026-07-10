import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STRATEGY_PROMPTS: Record<string, string> = {
  scalping: `You are a SCALPER on 1m-15m. Trade only with HTF bias + LTF liquidity sweep + clear order block reaction. Target 1:1.5 to 1:3 RR. SL must sit beyond the sweep wick, not at obvious round numbers.`,
  intraday: `You are an INTRADAY trader on H1-H4. Need confirmed BOS in trade direction, retest of OB/FVG/key zone, and session alignment (London/NY). Target 1:2 to 1:4 RR.`,
  swing: `You are a SWING trader on H4-D1-W1. Need Wyckoff phase context, weekly imbalance, or D1 BOS with H4 retest. Target 1:3 to 1:6 RR.`,
  smc: `You are an SMC analyst. Require: (1) liquidity sweep of recent equal highs/lows, (2) CHoCH or BOS on the entry timeframe, (3) entry from a refined OB/FVG in premium (for sells) or discount (for buys).`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { imageBase64, mimeType, pair, timeframe, notes, currentPrice, strategy, aggressiveness } = await req.json();
    if (!imageBase64) throw new Error("No chart image provided");

    const strategyKey = (strategy || "intraday").toLowerCase();
    const strategyDirective = STRATEGY_PROMPTS[strategyKey] || STRATEGY_PROMPTS.intraday;

    // aggressiveness: 'conservative' | 'balanced' | 'aggressive'
    const mode = (aggressiveness || "balanced").toLowerCase();
    const minConfluences = mode === "aggressive" ? 2 : mode === "conservative" ? 3 : 2;
    const minRR = mode === "aggressive" ? 1.2 : mode === "conservative" ? 1.8 : 1.5;
    const minConfidence = mode === "aggressive" ? 55 : mode === "conservative" ? 70 : 60;

    const systemPrompt = `You are a senior institutional chart analyst for Midnight Panda. Today: ${new Date().toUTCString()}.
${strategyDirective}

MODE: ${mode.toUpperCase()}. Your job is to give the trader an actionable read of THIS chart. Only refuse when the chart genuinely gives you nothing to work with — do NOT hide behind NO_TRADE when a reasonable directional bias exists.

MARKET STRUCTURE GATE:
Identify on the chart:
1. Swing sequence (HH/HL, LH/LL, or ranging) — name the last 2 swing points.
2. Last structural event: BOS or CHoCH — direction and approximate price.
3. Current location: premium / discount / equilibrium of the last leg.
4. Nearest liquidity (equal highs/lows, session high/low).

WHEN TO CALL A TRADE (be decisive):
- If there is a readable trend or a fresh BOS/CHoCH with a plausible entry zone, GIVE THE SIGNAL.
- Ranging price with a clear range high/low is tradable — fade the extreme back to mid, mark SL beyond the range.
- Pullback into an OB/FVG/prior S-R in the direction of HTF bias = valid trade even without a picture-perfect setup.
- ${minConfluences}+ confluences is enough. Do not require 4.

WHEN TO REFUSE (NO_TRADE):
- The chart is unreadable (blurry, no price axis, no candles).
- Price is dead-center of a tight chop with no defined range and no bias.
- The only possible entry gives worse than 1:${minRR} RR.
- Absolutely no directional read is possible.

CONFIDENCE:
- 80-95 = strong: fresh BOS + retest + HTF alignment, RR ≥ 1:2.
- 65-79 = solid: clear bias + reasonable entry zone.
- ${minConfidence}-64 = playable with tight risk — STILL RETURN AS A TRADE, flag reliability MEDIUM/LOW.
- Below ${minConfidence} = NO_TRADE.

PRICE GROUNDING: Anchor Entry/SL/TP to the provided Current Market Price. SL beyond the invalidation swing. TP before the next opposing liquidity, not through it.

Output JSON only. No markdown. No prose outside JSON.`;

    const userPrompt = `Analyze this chart with extreme discipline.

Pair: ${pair || "(identify from chart)"}
Timeframe: ${timeframe || "(identify from chart)"}
Current Market Price: ${currentPrice || "(read from latest candle)"}
Strategy Mode: ${strategyKey.toUpperCase()}
Trader notes: ${notes || "none"}

Walk through the Market Structure Gate, then output ONLY this JSON:
{
  "asset": "string",
  "timeframe": "string",
  "signal_action": "TRADE" | "NO_TRADE",
  "no_trade_reason": "if NO_TRADE, plain-English reason the trader can learn from",
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": number,
  "reliability": "HIGH" | "MEDIUM" | "LOW",
  "structure": {
    "trend": "uptrend HH/HL | downtrend LH/LL | range",
    "lastSwingHigh": "price",
    "lastSwingLow": "price",
    "lastEvent": "BOS bullish at X | CHoCH bearish at Y | none",
    "location": "premium | discount | equilibrium",
    "liquidityPools": ["equal highs at X", "Asia low at Y"]
  },
  "reasoning": {
    "trend": "primary + secondary",
    "keyLevels": "nearest S/R, zones",
    "indicators": "RSI/MACD/MA/structure readings",
    "confluences": ["c1", "c2", "c3"]
  },
  "summary": "2-3 sentence verdict (or why NO_TRADE)",
  "patterns": ["pattern names"],
  "entry": { "price": "exact price or N/A", "reason": "why here, or N/A if NO_TRADE" },
  "stopLoss": { "price": "exact price or N/A", "reason": "invalidation swing reference" },
  "takeProfit": { "price": "exact price or N/A", "reason": "target liquidity reference" },
  "riskReward": "1:X.X or N/A",
  "keyLevels": ["price1", "price2"],
  "indicators": ["RSI 62 bullish"],
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

    let analysis: any;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse chart analysis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side discipline guard
    const conf = typeof analysis.confidence === "number" ? analysis.confidence : 0;
    if (conf < 70 || analysis.signal_action === "NO_TRADE") {
      analysis.signal_action = "NO_TRADE";
      analysis.sentiment = "NEUTRAL";
      analysis.reliability = "LOW";
      analysis.warning = `🛑 NO-TRADE SIGNAL. ${analysis.no_trade_reason || analysis.warning || "Structure unclear — wait for a clean BOS + retest."}`;
      analysis.entry = { price: "N/A", reason: "No trade" };
      analysis.stopLoss = { price: "N/A", reason: "No trade" };
      analysis.takeProfit = { price: "N/A", reason: "No trade" };
      analysis.riskReward = "N/A";
    } else if (!analysis.reliability) {
      analysis.reliability = conf >= 85 ? "HIGH" : "MEDIUM";
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
