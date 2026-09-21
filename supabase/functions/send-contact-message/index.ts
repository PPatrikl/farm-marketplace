import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  forest_listing_id?: string;
  farm_listing_id?: string;
  receiver_id: string;
  name: string;
  email: string;
  message: string;
  website?: string; // honeypot
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Payload;

    // ── honeypot: bot filled in a hidden field → pretend everything's fine ──
    if (payload.website && payload.website.trim() !== "") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── basic validation ──
    const errors: string[] = [];
    if (!payload.receiver_id) errors.push("receiver_id is required");
    if (!payload.forest_listing_id && !payload.farm_listing_id)
      errors.push("forest_listing_id or farm_listing_id is required");
    if (payload.forest_listing_id && payload.farm_listing_id)
      errors.push("only one of forest_listing_id / farm_listing_id allowed");
    if (!payload.name?.trim()) errors.push("name is required");
    if (!payload.email?.trim() || !EMAIL_RE.test(payload.email))
      errors.push("valid email is required");
    if (!payload.message?.trim() || payload.message.trim().length < 10)
      errors.push("message must be at least 10 characters");

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join(", ") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // a client with `service_role` — for inserts and rate limiting, bypassing RLS
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // ── Determine the sender: authorized user or guest ──
    let senderId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) senderId = userData.user.id;
    }

    // ── rate limit: by email over the last N minutes ──
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000
    ).toISOString();

    const { count, error: rateError } = await admin
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("sender_email", payload.email.trim().toLowerCase())
      .gte("created_at", windowStart);

    if (rateError) {
      console.error("[send-contact-message] rate check error:", rateError.message);
    } else if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: "Too many messages, please try again later" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── insert ──
    const { data, error } = await admin
      .from("contacts")
      .insert([
        {
          forest_listing_id: payload.forest_listing_id ?? null,
          farm_listing_id: payload.farm_listing_id ?? null,
          receiver_id: payload.receiver_id,
          sender_id: senderId,
          sender_name: payload.name.trim(),
          sender_email: payload.email.trim().toLowerCase(),
          message: payload.message.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[send-contact-message] insert error:", error.message);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-contact-message] unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});