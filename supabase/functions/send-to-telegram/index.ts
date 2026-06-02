import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) throw new Error("Telegram not configured");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { symbol, direction, lotSize, entry, stopLoss, takeProfit, riskReward, reason, chatIdOverride } = body || {};
    if (!symbol || !direction || !lotSize || !entry || !stopLoss || !takeProfit) {
      return new Response(JSON.stringify({ error: "Missing required signal fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let chatId = chatIdOverride;
    if (!chatId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("telegram_chat_id")
        .eq("user_id", user.id)
        .maybeSingle();
      chatId = profile?.telegram_chat_id;
    }
    if (!chatId) {
      return new Response(JSON.stringify({ error: "No Telegram chat ID set. Add it in your profile first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Universal copier-bot friendly format (TeleTrader / TelegramFX / Profit-Way compatible)
    const dir = String(direction).toUpperCase();
    const text =
`🐼 <b>MIDNIGHT PANDA SIGNAL</b>

${dir} ${symbol} @ ${entry}
SL ${stopLoss}
TP ${takeProfit}
Lot: ${lotSize}
RR: ${riskReward || "—"}

<i>${(reason || "").slice(0, 280)}</i>

<code>${dir} ${symbol}
Entry: ${entry}
SL: ${stopLoss}
TP: ${takeProfit}
Lot: ${lotSize}</code>`;

    const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Telegram error:", res.status, data);
      return new Response(JSON.stringify({ error: data?.description || "Telegram send failed", details: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, message_id: data.result?.message_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-to-telegram error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
