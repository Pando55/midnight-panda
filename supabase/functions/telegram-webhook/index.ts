// Telegram onboarding wizard for Midnight Panda
// Handles /start → license → broker → account # → account type → instrument →
// timeframe → lot size → max positions → trailing stop → save.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function deriveSecret(key: string): Promise<string> {
  const data = new TextEncoder().encode(`telegram-webhook:${key}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function tg(method: string, body: unknown) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY")!;
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error("Telegram error", method, res.status, await res.text());
  return res;
}

const KB = {
  account_type: [[{ text: "Demo" }, { text: "Live" }]],
  instrument: [
    [{ text: "XAUUSD" }, { text: "US30" }, { text: "NAS100" }],
    [{ text: "EURUSD" }, { text: "GBPUSD" }, { text: "USDJPY" }],
    [{ text: "BTCUSD" }, { text: "Other" }],
  ],
  timeframe: [
    [{ text: "M5" }, { text: "M15" }, { text: "M30" }],
    [{ text: "H1" }, { text: "H4" }, { text: "D1" }],
  ],
};
const replyKb = (kb: unknown) => ({ keyboard: kb, resize_keyboard: true, one_time_keyboard: true });
const removeKb = { remove_keyboard: true };

async function send(chatId: number, text: string, kb?: unknown) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: kb ?? removeKb,
  });
}

type Row = {
  chat_id: number;
  wizard_state: string;
  wizard_data: Record<string, unknown>;
  [k: string]: unknown;
};

const STEPS: Array<{ state: string; prompt: string; kb?: unknown; field: string }> = [
  { state: "await_license", prompt: "🔑 Send your <b>Midnight Panda license key</b> to begin.", field: "license_key" },
  { state: "await_broker", prompt: "🏦 Which <b>broker</b> are you using? (e.g. Exness, FTMO, IC Markets)", field: "broker" },
  { state: "await_account_number", prompt: "🔢 Enter your <b>MT4/MT5 account number</b>.", field: "account_number" },
  { state: "await_account_type", prompt: "🧪 Demo or Live account?", kb: replyKb(KB.account_type), field: "account_type" },
  { state: "await_instrument", prompt: "📊 Pick your <b>primary instrument</b>:", kb: replyKb(KB.instrument), field: "instrument" },
  { state: "await_timeframe", prompt: "⏱ Pick your <b>timeframe</b>:", kb: replyKb(KB.timeframe), field: "timeframe" },
  { state: "await_lot_size", prompt: "📦 Default <b>lot size</b>? (e.g. 0.01, 0.1, 1)", field: "lot_size" },
  { state: "await_max_positions", prompt: "📈 <b>Max open positions</b> at once? (1–10)", field: "max_positions" },
  { state: "await_trailing_stop", prompt: "🛡 <b>Trailing stop</b> distance in pips? (e.g. 15). Send 0 to disable.", field: "trailing_stop_pips" },
];

function nextStep(state: string) {
  const i = STEPS.findIndex((s) => s.state === state);
  return i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1] : null;
}

function validate(field: string, raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const v = raw.trim();
  switch (field) {
    case "license_key":
      if (v.length < 6) return { ok: false, error: "That doesn't look like a valid key. Try again." };
      return { ok: true, value: v.toUpperCase() };
    case "account_type": {
      const lv = v.toLowerCase();
      if (lv !== "demo" && lv !== "live") return { ok: false, error: "Choose <b>Demo</b> or <b>Live</b>." };
      return { ok: true, value: lv };
    }
    case "account_number":
      if (!/^\d{3,15}$/.test(v)) return { ok: false, error: "Account number should be 3–15 digits." };
      return { ok: true, value: v };
    case "lot_size": {
      const n = Number(v);
      if (!isFinite(n) || n <= 0 || n > 100) return { ok: false, error: "Enter a lot size between 0.01 and 100." };
      return { ok: true, value: n };
    }
    case "max_positions": {
      const n = parseInt(v, 10);
      if (!Number.isInteger(n) || n < 1 || n > 10) return { ok: false, error: "Enter a number between 1 and 10." };
      return { ok: true, value: n };
    }
    case "trailing_stop_pips": {
      const n = Number(v);
      if (!isFinite(n) || n < 0 || n > 500) return { ok: false, error: "Enter pips between 0 and 500." };
      return { ok: true, value: n };
    }
    default:
      if (v.length < 1 || v.length > 64) return { ok: false, error: "Please send a short text answer (1–64 chars)." };
      return { ok: true, value: v };
  }
}

async function verifyLicense(supabase: ReturnType<typeof createClient>, key: string) {
  const { data } = await supabase
    .from("license_keys")
    .select("license_key, is_active, expires_at, duration, activated_by_user_id")
    .ilike("license_key", key)
    .maybeSingle();
  if (!data || !data.is_active) return { ok: false, msg: "❌ License invalid or inactive. Contact support: <b>+27 78 427 8143</b>" };
  if (data.expires_at && new Date(data.expires_at as string) < new Date()) return { ok: false, msg: "⌛ This license has expired." };
  return { ok: true, license_key: data.license_key, linked_user_id: data.activated_by_user_id };
}

function summary(row: Row): string {
  const d = { ...(row.wizard_data || {}), ...row };
  return `✅ <b>Setup complete!</b>

🔑 License: <code>${d.license_key ?? "—"}</code>
🏦 Broker: <b>${d.broker ?? "—"}</b>
🔢 Account: <code>${d.account_number ?? "—"}</code> (${d.account_type ?? "—"})
📊 Instrument: <b>${d.instrument ?? "—"}</b>
⏱ Timeframe: <b>${d.timeframe ?? "—"}</b>
📦 Lot size: <b>${d.lot_size ?? "—"}</b>
📈 Max positions: <b>${d.max_positions ?? "—"}</b>
🛡 Trailing stop: <b>${d.trailing_stop_pips ?? 0} pips</b>

You'll now receive <b>personalized signals</b> matching your instrument & timeframe.

ℹ️ <i>Auto-execution + trailing-stop management on MT4/MT5 requires the Midnight Panda EA on your terminal. For now, signals will arrive here in copier-bot format.</i>

Type /settings to review, /reset to start over.`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!TELEGRAM_API_KEY) return new Response("not configured", { status: 500 });

  const expected = await deriveSecret(TELEGRAM_API_KEY);
  if (!safeEqual(req.headers.get("X-Telegram-Bot-Api-Secret-Token"), expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let update: any;
  try { update = await req.json(); } catch { return new Response("{}", { status: 200 }); }

  const msg = update.message ?? update.edited_message;
  if (!msg?.chat?.id || typeof update.update_id !== "number") {
    return new Response(JSON.stringify({ ok: true, ignored: true }));
  }

  // Idempotency
  const { error: dupErr } = await supabase.from("telegram_updates").insert({
    update_id: update.update_id, chat_id: msg.chat.id, raw_update: update,
  });
  if (dupErr && dupErr.code === "23505") return new Response(JSON.stringify({ ok: true, dup: true }));

  const chatId: number = msg.chat.id;
  const text: string = (msg.text ?? "").trim();
  const username: string | null = msg.from?.username ?? null;

  // Load or create user row
  let { data: row } = await supabase
    .from("telegram_users").select("*").eq("chat_id", chatId).maybeSingle();
  if (!row) {
    const ins = await supabase.from("telegram_users").insert({
      chat_id: chatId, telegram_username: username, wizard_state: "idle", wizard_data: {},
    }).select("*").single();
    row = ins.data!;
  }

  try {
    // Commands
    if (text === "/start") {
      await supabase.from("telegram_users").update({
        wizard_state: STEPS[0].state, wizard_data: {},
      }).eq("chat_id", chatId);
      await send(chatId, `🐼 <b>Welcome to Midnight Panda</b>

I'll set up your auto-trading preferences in 9 quick steps. Type /cancel anytime.

`);
      await send(chatId, STEPS[0].prompt, STEPS[0].kb);
      return new Response(JSON.stringify({ ok: true }));
    }
    if (text === "/cancel" || text === "/reset") {
      await supabase.from("telegram_users").update({
        wizard_state: "idle", wizard_data: {},
      }).eq("chat_id", chatId);
      await send(chatId, "🛑 Wizard cancelled. Type /start to begin again.");
      return new Response(JSON.stringify({ ok: true }));
    }
    if (text === "/settings") {
      await send(chatId, summary(row as Row));
      return new Response(JSON.stringify({ ok: true }));
    }
    if (text === "/help") {
      await send(chatId, "Commands:\n/start — set up preferences\n/settings — view current setup\n/reset — start over\n/cancel — stop wizard");
      return new Response(JSON.stringify({ ok: true }));
    }

    const state = (row as Row).wizard_state;
    const step = STEPS.find((s) => s.state === state);
    if (!step) {
      await send(chatId, "👋 Type /start to set up your auto-trading preferences.");
      return new Response(JSON.stringify({ ok: true }));
    }

    const v = validate(step.field, text);
    if (!v.ok) {
      await send(chatId, `⚠️ ${v.error}`, step.kb);
      return new Response(JSON.stringify({ ok: true }));
    }

    // License gate
    if (step.field === "license_key") {
      const lic = await verifyLicense(supabase, v.value as string);
      if (!lic.ok) { await send(chatId, lic.msg!); return new Response(JSON.stringify({ ok: true })); }
      await supabase.from("telegram_users").update({
        license_key: lic.license_key, linked_user_id: lic.linked_user_id ?? null,
      }).eq("chat_id", chatId);
    } else {
      const patch: Record<string, unknown> = {};
      patch[step.field] = v.value;
      await supabase.from("telegram_users").update(patch).eq("chat_id", chatId);
    }

    const next = nextStep(state);
    if (next) {
      await supabase.from("telegram_users").update({ wizard_state: next.state }).eq("chat_id", chatId);
      await send(chatId, next.prompt, next.kb);
    } else {
      await supabase.from("telegram_users").update({
        wizard_state: "complete", onboarded_at: new Date().toISOString(),
      }).eq("chat_id", chatId);
      const { data: fresh } = await supabase.from("telegram_users").select("*").eq("chat_id", chatId).maybeSingle();
      await send(chatId, summary(fresh as Row));
    }
    return new Response(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error("telegram-webhook error", e);
    await send(chatId, "⚠️ Something went wrong. Type /reset to start over.").catch(() => {});
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
});
