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

    const now = new Date();
    const prompt = `You are a financial calendar data provider. Today is ${now.toISOString().split('T')[0]}.

Generate the REAL economic calendar events for this week and next week. Include actual scheduled economic releases that are typically on the calendar. Use real event names, actual countries, and realistic forecast/previous values.

Return ONLY valid JSON array with 15-20 events, no markdown:
[
  {
    "id": "eco_001",
    "title": "Event Name (e.g. Non-Farm Payrolls, CPI m/m, FOMC Statement)",
    "country": "US|EU|UK|JP|AU|CN|CH|CA|NZ",
    "currency": "USD|EUR|GBP|JPY|AUD|CNY|CHF|CAD|NZD",
    "impact": "HIGH|MEDIUM|LOW",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "forecast": "value or null",
    "previous": "value",
    "actual": "value or null (only for past events today)"
  }
]

Include a mix of HIGH, MEDIUM impact events across USD, EUR, GBP, JPY, AUD, and other currencies. Sort by date then time. Use realistic forecast and previous values. Events that have already passed today should have actual values.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a financial calendar provider. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Calendar data unavailable" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let events;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      events = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse calendar data:", content);
      return new Response(JSON.stringify({ error: "Failed to parse calendar data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ events, timestamp: now.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-economic-calendar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
