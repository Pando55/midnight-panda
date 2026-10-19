// Server-side license administration. Admin actions require a verified sign-in
// that holds the admin role (or the verified owner email). Activation uses the
// signed-in user's token and the activate_license_key database function.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OWNER_EMAIL = "mohalethapelo93@gmail.com";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(URL_, SERVICE);
const DURATIONS = ["3months", "6months", "12months", "18months", "lifetime"];
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeKey = () => {
  const b = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(b, (x) => CHARS[x % CHARS.length]).join("");
  return `P-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ success: false, error: "Sign in required" }, 401);
    const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ success: false, error: "Sign in required" }, 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "activate") {
      const key = String(body.key ?? "").toUpperCase().trim();
      if (!/^P-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) return json({ success: false, error: "Invalid key format" }, 400);
      const { data, error } = await userClient.rpc("activate_license_key", { _license_key: key });
      if (error) return json({ success: false, error: error.message }, 403);
      const r = (data as any[])[0];
      return json({ success: true, license: { key: r.license_key, duration: r.duration, activatedAt: r.activated_at, expiresAt: r.expires_at, isActive: true } });
    }

    if (action === "status") {
      const { data } = await admin.from("user_licenses").select("license_key,duration,activated_at,expires_at,is_active,license_key_id").eq("user_id", user.id).maybeSingle();
      let license = null;
      if (data) {
        const { data: k } = await admin.from("license_keys").select("is_active").eq("id", data.license_key_id).maybeSingle();
        const valid = data.is_active && k?.is_active && (!data.expires_at || new Date(data.expires_at) > new Date());
        license = { key: data.license_key, duration: data.duration, activatedAt: data.activated_at, expiresAt: data.expires_at, isActive: !!valid };
      }
      const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const isAdmin = !!role || (!!user.email_confirmed_at && user.email?.toLowerCase() === OWNER_EMAIL);
      return json({ success: true, license, isAdmin });
    }

    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    const isAdmin = !!role || (!!user.email_confirmed_at && user.email?.toLowerCase() === OWNER_EMAIL);
    if (!isAdmin) return json({ success: false, error: "Unauthorized" }, 403);

    if (action === "list") {
      const { data, error } = await admin.from("license_keys").select("*").order("created_at", { ascending: false });
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, keys: data });
    }
    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !DURATIONS.includes(body.duration)) return json({ success: false, error: "Valid email and duration required" }, 400);
      const { data, error } = await admin.from("license_keys").insert({ license_key: makeKey(), customer_email: email, duration: body.duration, is_active: true, created_by_user_id: user.id }).select().single();
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, key: data });
    }
    if (action === "deactivate" || action === "delete") {
      // Revocation keeps the record (history/audit); delete is treated as revoke.
      const id = String(body.keyId ?? "");
      const { error } = await admin.from("license_keys").update({ is_active: false, auto_trading_enabled: false }).eq("id", id);
      if (error) return json({ success: false, error: error.message }, 500);
      await admin.from("user_licenses").update({ is_active: false }).eq("license_key_id", id);
      return json({ success: true });
    }
    return json({ success: false, error: "Unknown action" }, 400);
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
