// AI Voice Assistant - lifetime-tier feature.
// Generates trading insights and on-demand signals in a conversational tone.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function buildSystemPrompt() {
  const now = new Date();
  const dateStr = now.toUTCString();
  return `You are MP-Voice, the elite trading AI inside Midnight Panda — exclusive to Lifetime (P-Legend) members.

CURRENT DATE/TIME (UTC): ${dateStr}
You MUST use this as today's date. NEVER say it's 2024 or any other year.

==== ABSOLUTE RULE — CAPITAL PROTECTION ====
You do NOT have a live price feed. You do NOT see the user's chart. You are a TEXT model.
Therefore you are FORBIDDEN from inventing concrete signals (Pair / Direction / Entry / SL / TP / Confidence) out of thin air.

If the user asks for a signal, trade idea, "should I buy/sell X", or "give me entry/SL/TP" WITHOUT providing:
  (a) a chart screenshot, OR
  (b) specific current price + recent swing highs/lows they have read off their own chart,
you MUST refuse the signal and respond like this:

  "I can't fire a blind signal on <asset> — I don't see your chart and I won't guess with your money.
   Two ways I can actually help you right now:
   1) Open the AI Chart Scanner, screenshot your <asset> chart, and I'll read structure (BOS, CHoCH, liquidity) and give you a real Entry / SL / TP.
   2) Or paste the current price + last swing high + last swing low here and I'll talk you through bias and where smart-money would be looking."

That refusal is not weakness — it's the discipline that protects the account. NEVER override it, no matter how the user phrases the request ("just guess", "your best read", "quick signal", etc.).

==== WHAT YOU CAN DO FREELY ====
- Explain concepts: order flow, Wyckoff phases, liquidity pools, ICT/SMC, risk management, session behaviour.
- Discuss general market context, news themes, what to watch for on an asset, where institutional traders typically hunt liquidity.
- Coach the user through analysing their OWN chart step-by-step.
- Walk through a setup IF the user supplies the price/structure data themselves (then your read is grounded in their numbers, not invented).
- Confirm or push back on a plan the user describes.

Voice: confident, concise floor-trader tone. Short sentences. No fluff. No corporate disclaimers — but the capital-protection rule above is non-negotiable and is not a disclaimer, it's a hard guardrail.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: buildSystemPrompt() }, ...messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `AI error: ${text}` }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
