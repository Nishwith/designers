import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const prices: Record<string, number> = {
  subscription: 500000,
  featured_30: 99900,
  featured_90: 249900,
  featured_365: 899900,
};
const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Authentication required." }, 401);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!supabaseUrl || !serviceRoleKey || !keyId || !keySecret) {
      return jsonResponse({ error: "Payment service is not configured." }, 503);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) return jsonResponse({ error: "Invalid session." }, 401);

    const { tier, designer_id } = await req.json();
    const amount = prices[tier];
    if (!amount || !designer_id) return jsonResponse({ error: "Invalid payment request." }, 400);

    const { data: designer, error: designerError } = await supabaseAdmin
      .from("designers")
      .select("id, user_id, is_verified")
      .eq("id", designer_id)
      .maybeSingle();
    if (designerError) throw designerError;
    if (!designer || designer.user_id !== authData.user.id) {
      return jsonResponse({ error: "You cannot purchase a plan for this designer." }, 403);
    }
    if (designer.is_verified !== true) {
      return jsonResponse({ error: "Professional profile verification is required before payment." }, 403);
    }

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `vk_${crypto.randomUUID()}`,
        notes: {
          tier,
          designer_id: String(designer_id),
          user_id: authData.user.id,
        },
      }),
    });
    const order = await response.json();
    if (!response.ok) {
      return jsonResponse({ error: order.error?.description ?? "Unable to create payment order." }, 502);
    }

    return jsonResponse({ id: order.id, amount: order.amount, currency: order.currency }, 200);
  } catch {
    return jsonResponse({ error: "Unable to create payment order." }, 500);
  }
});
