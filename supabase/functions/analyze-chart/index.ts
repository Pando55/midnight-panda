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

    const { imageBase64, mimeType, pair, timeframe, notes, currentPrice, strategy } = await req.json();
    if (!imageBase64) throw new Error("No chart image provided");

    const strategyKey = (strategy || "intraday").toLowerCase();
    const strategyDirective = STRATEGY_PROMPTS[strategyKey] || STRATEGY_PROMPTS.intraday;

    const systemPrompt = `You are a senior institutional chart analyst for Midnight Panda. Today: ${new Date().toUTCString()}.
${strategyDirective}

CRITICAL — YOUR #1 JOB IS TO PROTECT THE TRADER'S CAPITAL. It is FAR better to return NO_TRADE than to force a bad signal. Yesterday a forced signal hit SL in 2 minutes — never again.

MARKET STRUCTURE GATE (mandatory):
Before producing ANY signal you MUST identify on the chart:
1. Swing sequence: are we making HH/HL (uptrend), LH/LL (downtrend), or ranging? Name the last 2 swing points.
2. Last structural event: BOS (break of structure) or CHoCH (change of character) — direction and approximate price.
3. Current location: are we in premium, discount, or equilibrium of the last leg?
4. Liquidity: where is the obvious resting liquidity (equal highs/lows, prior session high/low)?

NO-TRADE RULES — return sentiment "NEUTRAL" and signal_action "NO_TRADE" if ANY of these are true:
- Price is mid-range with no clear BOS/CHoCH.
- Structure is choppy / overlapping candles / no clean swings.
- Price is sitting directly into major resistance for a BUY or major support for a SELL (chasing).
- You cannot clearly read price from the chart.
- Less than 3 real confluences.
- High-impact news visibly imminent (if shown).
- RR would be worse than 1:1.5.

CONFIDENCE RULES:
- 85-95 = 4+ confluences, fresh BOS, clean retest, RR ≥ 1:2.5.
- 70-84 = 3 confluences, decent structure.
- < 70 = MUST become NO_TRADE.

PRICE GROUNDING: Anchor Entry/SL/TP to the provided Current Market Price. SL must sit beyond the invalidation swing (not a random number). TP must sit before the next opposing liquidity pool, not through it.

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
