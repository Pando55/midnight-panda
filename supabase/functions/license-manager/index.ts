// Public license manager edge function.
// Handles activation (any user) and admin operations (list/create/deactivate/delete)
// using a hardcoded admin email gate. Uses service role to bypass RLS safely.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const ADMIN_EMAIL = "mohalethapelo93@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeKey() {
  const part = () => Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
  return `P-${part()}-${part()}-${part()}`;
}

function durationToMs(d: string): number | null {
  switch (d) {
    case "3months": return 90 * 86400000;
    case "6months": return 180 * 86400000;
    case "12months": return 365 * 86400000;
    case "18months": return 547 * 86400000;
    case "lifetime": return null;
    default: return 0;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, key, email, duration, keyId, adminEmail } = await req.json();

    // ---- PUBLIC: activate ----
    if (action === "activate") {
      if (!key) return json({ success: false, error: "Key required" }, 400);
      const normalized = String(key).toUpperCase().trim();
      const { data: row, error } = await supabase
        .from("license_keys")
        .select("*")
        .eq("license_key", normalized)
        .maybeSingle();

      if (error) return json({ success: false, error: error.message }, 500);
      if (!row) return json({ success: false, error: "Invalid license key" }, 404);
      if (!row.is_active) return json({ success: false, error: "Key has been deactivated" }, 403);

      // Already activated? Check expiry
      const now = new Date();
      let expiresAt: Date | null = row.expires_at ? new Date(row.expires_at) : null;
      if (!row.activated_at) {
        const ms = durationToMs(row.duration);
        expiresAt = ms === null ? null : new Date(now.getTime() + ms);
        await supabase
          .from("license_keys")
          .update({ activated_at: now.toISOString(), expires_at: expiresAt?.toISOString() ?? null })
          .eq("id", row.id);
      } else if (expiresAt && expiresAt < now) {
        return json({ success: false, error: "License expired" }, 403);
      }

      return json({
        success: true,
        license: {
          key: normalized,
          duration: row.duration,
          activatedAt: row.activated_at ?? now.toISOString(),
          expiresAt: expiresAt?.toISOString() ?? null,
          isActive: true,
        },
      });
    }

    // ---- ADMIN gate ----
    const isAdmin = adminEmail && String(adminEmail).toLowerCase() === ADMIN_EMAIL;
    if (!isAdmin) return json({ success: false, error: "Unauthorized" }, 401);

    if (action === "list") {
      const { data, error } = await supabase
        .from("license_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, keys: data });
    }

    if (action === "create") {
      if (!email || !duration) return json({ success: false, error: "email and duration required" }, 400);
      const newKey = makeKey();
      const { data, error } = await supabase
        .from("license_keys")
        .insert({ license_key: newKey, customer_email: email, duration, is_active: true })
        .select()
        .single();
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, key: data });
    }

    if (action === "deactivate") {
      if (!keyId) return json({ success: false, error: "keyId required" }, 400);
      const { error } = await supabase.from("license_keys").update({ is_active: false }).eq("id", keyId);
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "delete") {
      if (!keyId) return json({ success: false, error: "keyId required" }, 400);
      const { error } = await supabase.from("license_keys").delete().eq("id", keyId);
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
