// Midnight Panda terminal bridge: pairs a real MT4/MT5 terminal (running the
// MidnightPandaBridge EA) with a user account, receives candles/heartbeats,
// runs deterministic scans, and hands queued trade requests to the terminal.
// No MetaAPI, no Telegram copier. Live execution stays locked server-side.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { analyze, type Bar } from "../_shared/analysis.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { validateTrade, candleIssue } from "../_shared/trading-validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

const TF_MINUTES: Record<string, number> = { M1: 1, M5: 5, M15: 15, M30: 30, H1: 60, H4: 240, D1: 1440, W1: 10080 };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

async function requireUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function requireAccount(token: string, accountId: string) {
  if (!token || !accountId) return null;
  const hash = await sha256(token);
  const { data } = await db.from("trading_accounts").select("*").eq("id", accountId).eq("credential_hash", hash).maybeSingle();
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // ---------- User-facing actions (need sign-in) ----------
    if (["pair_start", "status", "set_risk", "stop", "resume", "authorize", "scan", "quote", "execute", "unpair"].includes(action)) {
      const user = await requireUser(req);
      if (!user) return json({ error: "Sign in required" }, 401);

      if (action === "pair_start") {
        const broker = String(body.broker || "").trim().slice(0, 60);
        if (!["MT4", "MT5"].includes(body.platform)) return json({ error: "Select MT4 or MT5" }, 400);
        const platform = body.platform;
        const accountNumber = String(body.account_number || "").trim().slice(0, 40);
        const server = String(body.server || "").trim().slice(0, 80);
        if (!broker || !accountNumber || !server) return json({ error: "Broker, account number and server are required" }, 400);
        const code = randomCode();
        const { data, error } = await db
          .from("trading_accounts")
          .upsert(
            {
              user_id: user.id, broker, platform, account_number: accountNumber, server,
              pair_code_hash: await sha256(code), pair_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
              credential_hash: null, paired_at: null, stopped: true,
            },
            { onConflict: "user_id,platform,account_number,server" },
          )
          .select("id")
          .single();
        if (error) return json({ error: error.message }, 400);
        return json({ account_id: data.id, code, expires_in_seconds: 600 });
      }

      if (action === "status") {
        const { data: accounts } = await db
          .from("trading_accounts")
          .select("id,broker,platform,account_number,server,is_demo,account_mode,currency,balance,equity,free_margin,selected_symbol,selected_timeframe,stopped,last_sync_at,paired_at,max_risk_percent,max_exposure_lots,daily_loss_percent,authorization_expires_at,live_enabled")
          .eq("user_id", user.id)
          .order("created_at");
        const { data: requests } = await db
          .from("trade_requests")
          .select("id,account_id,scan_id,kind,mode,status,payload,result,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        const now = Date.now();
        return json({
          accounts: (accounts || []).map((a) => ({ ...a, connected: !!a.paired_at && !!a.last_sync_at && now - new Date(a.last_sync_at).getTime() < 15000 })),
          requests: requests || [],
        });
      }

      if (action === "set_risk") {
        const patch: Record<string, number> = {};
        for (const key of ["max_risk_percent", "max_exposure_lots", "daily_loss_percent"]) {
          const v = Number(body[key]);
          if (Number.isFinite(v) && v > 0 && v <= 100) patch[key] = v;
        }
        if (!Object.keys(patch).length) return json({ error: "Nothing to update" }, 400);
        const { error } = await db.from("trading_accounts").update(patch).eq("id", body.account_id).eq("user_id", user.id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      if (action === "stop" || action === "resume") {
        const { error } = await db.from("trading_accounts").update({ stopped: action === "stop" }).eq("id", body.account_id).eq("user_id", user.id);
        if (error) return json({ error: error.message }, 400);
        if (action === "stop") await db.from("trade_requests").update({ status: "cancelled" }).eq("account_id", body.account_id).eq("user_id", user.id).in("status", ["queued", "claimed"]);
        return json({ ok: true, stopped: action === "stop" });
      }

      if (action === "authorize") {
        // Re-entering an active license authorizes auto execution on this account for 12 hours.
        const key = String(body.license_key || "").trim();
        if (!key) return json({ error: "License key required" }, 400);
        const { data: lic } = await db
          .from("user_licenses")
          .select("license_key_id,license_key,expires_at,is_active")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        if (!lic || lic.license_key.toUpperCase() !== key.toUpperCase()) return json({ error: "That key is not active on your account" }, 403);
        if (lic.expires_at && new Date(lic.expires_at) <= new Date()) return json({ error: "License expired" }, 403);
        const { data: keyRecord } = await db.from("license_keys").select("is_active,auto_trading_enabled,activated_by_user_id,expires_at").eq("id", lic.license_key_id).maybeSingle();
        if (!keyRecord?.is_active || !keyRecord.auto_trading_enabled || keyRecord.activated_by_user_id !== user.id || (keyRecord.expires_at && new Date(keyRecord.expires_at) <= new Date())) return json({ error: "License is not entitled to auto trading" }, 403);
        const { error } = await db
          .from("trading_accounts")
          .update({ authorization_license_id: lic.license_key_id, authorization_expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString() })
          .eq("id", body.account_id)
          .eq("user_id", user.id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, authorization_hours: 12 });
      }

      if (action === "unpair") {
        const { error } = await db.from("trading_accounts").update({ credential_hash: null, paired_at: null, last_sync_at: null, stopped: true }).eq("id", body.account_id).eq("user_id", user.id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      if (action === "scan") {
        const { data: account } = await db.from("trading_accounts").select("*").eq("id", body.account_id).eq("user_id", user.id).maybeSingle();
        if (!account) return json({ error: "Account not found" }, 404);
        if (!account.last_sync_at || Date.now() - new Date(account.last_sync_at).getTime() > 15000) return json({ error: "Terminal is disconnected — open MT4/MT5 with the bridge EA attached" }, 409);
        const candles = (account.snapshot?.candles || []) as Bar[];
        const symbol = account.selected_symbol;
        const timeframe = account.selected_timeframe || "M1";
        const digits = symbol.includes("JPY") ? 3 : symbol.startsWith("XAU") ? 2 : 5;
        if (!symbol || (body.symbol && body.symbol !== symbol) || (body.timeframe && body.timeframe !== timeframe)) return json({ error: "Selected symbol/timeframe must match the terminal chart; switch the chart in MetaTrader first" }, 409);
        const issue = candleIssue(candles, timeframe, Number(account.snapshot?.utc_time) || Date.now()/1000);
        const result = issue ? { outcome: "INSUFFICIENT_DATA", symbol, timeframe, setup: null, reasons: [issue], missing: ["Fresh closed broker candles"], drawings: [] } : analyze(candles, symbol, timeframe, { digits: account.snapshot?.digits ?? digits });
        const tfMin = TF_MINUTES[timeframe] ?? 1;
        // New scan invalidates older open scans for this account.
        await db.from("chart_scans").update({ invalidated: true }).eq("account_id", account.id).eq("invalidated", false);
        const { data: scan, error } = await db
          .from("chart_scans")
          .insert({
            user_id: user.id, account_id: account.id, symbol, timeframe, source: "broker",
            outcome: result.outcome, analysis: result,
            expires_at: new Date(Date.now() + 2 * tfMin * 60 * 1000).toISOString(),
          })
          .select("id")
          .single();
        if (error) return json({ error: error.message }, 400);
        return json({ scan_id: scan.id, account_id: account.id, source: "Broker terminal · closed candles", scanned_at: new Date().toISOString(), expires_at: new Date(Date.now() + 2 * tfMin * 60 * 1000).toISOString(), ...result });
      }

      if (action === "execute" || action === "quote") {
        const invalid = validateTrade(body);
        if (invalid) return json({ error: invalid }, 400);
        const { data, error } = await db.rpc("queue_terminal_request", {
          uid: user.id, aid: body.account_id, sid: body.scan_id, idem: body.idempotency_key,
          knd: action === "quote" ? "QUOTE" : "EXECUTE", md: body.mode,
          body: { orders: body.orders, lot: body.lot, trailing_stop_pips: body.trailing_stop_pips, quote_id: body.quote_id || null },
        });
        if (error) return json({ error: error.message }, 400);
        return json({ request_id: data });
      }
    }

    // ---------- EA-facing actions (need account token) ----------
    if (action === "pair_confirm") {
      const code = String(body.code || "").trim().toUpperCase();
      if (!code) return json({ error: "Pairing code required" }, 400);
      const hash = await sha256(code);
      const { data: account } = await db
        .from("trading_accounts")
        .select("*")
        .eq("pair_code_hash", hash)
        .is("paired_at", null)
        .gt("pair_expires_at", new Date().toISOString())
        .maybeSingle();
      if (!account) return json({ error: "Invalid or expired pairing code" }, 403);
      if (String(body.account_number) !== account.account_number || body.platform !== account.platform || body.server !== account.server) return json({ error: "Terminal account, platform or server does not match the pairing request" }, 403);
      const token = crypto.randomUUID() + crypto.randomUUID();
      const { data: paired, error } = await db
        .from("trading_accounts")
        .update({ credential_hash: await sha256(token), paired_at: new Date().toISOString(), pair_code_hash: null, pair_expires_at: null })
        .eq("id", account.id).eq("pair_code_hash", hash).is("paired_at", null).select("id").maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!paired) return json({ error: "Pairing code already consumed" }, 409);
      return json({ account_id: account.id, token, platform: account.platform });
    }

    if (["heartbeat", "claim", "permit", "report"].includes(action)) {
      const account = await requireAccount(String(body.token || ""), String(body.account_id || ""));
      if (!account) return json({ error: "Unknown account or token" }, 403);

      if (action === "heartbeat") {
        if (String(body.account_number) !== account.account_number || body.server !== account.server || body.platform !== account.platform) return json({ error: "Paired terminal identity mismatch" }, 403);
        if (typeof body.is_demo !== "boolean" || !Number.isFinite(body.utc_time) || !Number.isFinite(body.digits) || Math.abs(Date.now()/1000-body.utc_time)>30) return json({ error: "Invalid terminal heartbeat or clock" }, 400);
        const symbol = String(body.symbol || account.selected_symbol || "").slice(0, 20);
        const timeframe = String(body.timeframe || account.selected_timeframe || "M1").slice(0, 4);
        const candles = Array.isArray(body.candles) ? (body.candles as Bar[]).slice(-300) : undefined;
        const symbolChanged = symbol && account.selected_symbol && symbol !== account.selected_symbol;
        const tfChanged = timeframe && account.selected_timeframe && timeframe !== account.selected_timeframe;
        if (symbolChanged || tfChanged) {
          // Chart or timeframe changed on the terminal: old scans/tickets no longer apply.
          await db.from("chart_scans").update({ invalidated: true }).eq("account_id", account.id).eq("invalidated", false);
        }
        const snapshot: Record<string, unknown> = {
          positions: Array.isArray(body.positions) ? body.positions.slice(0, 50) : [],
          server_time: body.server_time || null, utc_time: body.utc_time, digits: body.digits,
        };
        if (candles && candles.length) snapshot.candles = candles;
        else if (account.snapshot?.candles) snapshot.candles = account.snapshot.candles;
        const { error } = await db
          .from("trading_accounts")
          .update({
            last_sync_at: new Date().toISOString(),
            balance: Number(body.balance) || 0,
            equity: Number(body.equity) || 0,
            free_margin: Number(body.free_margin) || 0,
            currency: String(body.currency || "").slice(0, 8),
            is_demo: body.is_demo === false ? false : true,
            account_mode: body.is_demo === false ? "live" : "demo",
            // Heartbeats are not proof of a demo fill; verification stays external.
            selected_symbol: symbol,
            selected_timeframe: timeframe,
            snapshot,
          })
          .eq("id", account.id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, stopped: account.stopped, risk: { max_risk_percent: account.max_risk_percent, max_exposure_lots: account.max_exposure_lots, daily_loss_percent: account.daily_loss_percent } });
      }

      if (action === "claim") {
        const { data, error } = await db.rpc("claim_terminal_request", { aid: account.id });
        if (error) return json({ error: error.message }, 400);
        const request = Array.isArray(data) && data.length ? data[0] : null;
        if (!request) return json({ command: "NONE" });
        const { data: scan } = await db.from("chart_scans").select("analysis,symbol,timeframe").eq("id", request.scan_id).eq("account_id", account.id).maybeSingle();
        if (!scan?.analysis?.setup) return json({ command: "NONE" });
        const setup = scan.analysis.setup;
        return json({ command: request.kind, request_id: request.id, symbol: scan.symbol, timeframe: scan.timeframe,
          direction: setup.direction, entry: setup.entry, sl: setup.sl, tp: setup.tp,
          lot: request.payload.lot, orders: request.payload.orders, trailing_stop_pips: request.payload.trailing_stop_pips,
          max_risk_percent: account.max_risk_percent, max_exposure_lots: account.max_exposure_lots, daily_loss_percent: account.daily_loss_percent });
      }

      if (action === "permit") {
        const { data: ownRequest } = await db.from("trade_requests").select("id").eq("id", body.request_id).eq("account_id", account.id).maybeSingle();
        if (!ownRequest || !Number.isInteger(body.order_index) || body.order_index < 0) return json({ permitted: false }, 403);
        const { data, error } = await db.rpc("consume_trade_permit", { rid: body.request_id, order_index: Number(body.order_index) });
        if (error) return json({ error: error.message }, 400);
        return json({ permitted: !!data });
      }

      if (action === "report") {
        const allowed = ["filled", "partial", "rejected", "cancelled", "unknown", "executing", "quoted"];
        const status = allowed.includes(body.status) ? body.status : "unknown";
        const { data: existing } = await db.from("trade_requests").select("result,status").eq("id", body.request_id).eq("account_id", account.id).maybeSingle();
        if (!existing || !["claimed", "executing"].includes(existing.status)) return json({ error: "Request is no longer active" }, 409);
        const { error } = await db
          .from("trade_requests")
          .update({ status, result: { ...(typeof body.result === "object" && body.result ? body.result : {}), permitted: existing.result?.permitted || 0 } })
          .eq("id", body.request_id)
          .eq("account_id", account.id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Bridge error" }, 500);
  }
});
