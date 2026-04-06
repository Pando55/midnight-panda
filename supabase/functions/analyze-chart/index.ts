import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase config missing");

    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imagePath, pair, timeframe, notes } = await req.json();

    if (!imagePath) throw new Error("No chart image provided");

    // Download the image from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from("chart-uploads")
      .download(imagePath);

    if (dlError || !fileData) throw new Error("Failed to download chart image");

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

    const prompt = `You are an expert technical analyst for a trading signals app called Midnight Panda. Analyze this chart image.

${pair ? `Currency Pair / Asset: ${pair}` : "Identify the asset from the chart if possible."}
${timeframe ? `Timeframe: ${timeframe}` : "Identify the timeframe if visible."}
${notes ? `Trader's Notes: ${notes}` : ""}

Provide analysis in this EXACT JSON format (no markdown, raw JSON only):
{
  "asset": "identified or provided asset name",
  "timeframe": "identified or provided timeframe",
  "sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "confidence": number between 60-95,
  "summary": "2-3 sentence overview of what you see on the chart",
  "patterns": ["list of chart patterns identified e.g. Double Bottom, Head & Shoulders"],
  "entry": {
    "price": suggested entry price as string,
    "reason": "Why enter here based on the chart"
  },
  "stopLoss": {
    "price": stop loss price as string,
    "reason": "Why place SL here based on chart structure"
  },
  "takeProfit": {
    "price": take profit price as string,
    "reason": "Why target this level based on chart"
  },
  "riskReward": "risk to reward ratio like 1:2.5",
  "keyLevels": ["list of important price levels visible on chart"],
  "indicators": ["any visible indicators and their readings"],
  "warning": "any risk factors or concerns about this setup"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional chart analyst. Analyze chart images with precision. Always respond with valid JSON only." },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
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
