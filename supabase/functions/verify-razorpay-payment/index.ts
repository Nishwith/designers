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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      tier,
      designer_id,
    } = await req.json();
    const expectedAmount = prices[tier];
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !expectedAmount || !designer_id) {
      return jsonResponse({ error: "Invalid payment verification request." }, 400);
    }

    const { data: designer, error: designerError } = await supabaseAdmin
      .from("designers")
      .select("id, user_id, subscription_end, is_verified")
      .eq("id", designer_id)
      .maybeSingle();
    if (designerError) throw designerError;
    if (!designer || designer.user_id !== authData.user.id) {
      return jsonResponse({ error: "You cannot update this designer subscription." }, 403);
    }
    if (designer.is_verified !== true) {
      return jsonResponse({ error: "Professional profile verification is required before payment." }, 403);
    }

    const signatureKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(keySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      signatureKey,
      new TextEncoder().encode(`${razorpay_order_id}|${razorpay_payment_id}`),
    );
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    if (expectedSignature !== razorpay_signature) {
      return jsonResponse({ error: "Invalid payment signature." }, 400);
    }

    const razorpayHeaders = {
      "Authorization": `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    };
    const [orderResponse, paymentResponse] = await Promise.all([
      fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}`, { headers: razorpayHeaders }),
      fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, { headers: razorpayHeaders }),
    ]);
    if (!orderResponse.ok || !paymentResponse.ok) {
      return jsonResponse({ error: "Could not confirm the payment with Razorpay." }, 502);
    }
    const [order, payment] = await Promise.all([orderResponse.json(), paymentResponse.json()]);
    const notes = order.notes ?? {};
    if (
      order.id !== razorpay_order_id ||
      order.amount !== expectedAmount ||
      order.currency !== "INR" ||
      order.status !== "paid" ||
      notes.tier !== tier ||
      notes.designer_id !== String(designer_id) ||
      notes.user_id !== authData.user.id ||
      payment.id !== razorpay_payment_id ||
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured" ||
      payment.amount !== expectedAmount ||
      payment.currency !== "INR"
    ) {
      return jsonResponse({ error: "Payment does not match the requested plan." }, 400);
    }

    const { data: existingPayment, error: historyLookupError } = await supabaseAdmin
      .from("payment_history")
      .select("gateway_transaction_id")
      .eq("gateway_transaction_id", razorpay_payment_id)
      .maybeSingle();
    if (historyLookupError) throw historyLookupError;
    if (existingPayment) return jsonResponse({ error: "This payment has already been processed." }, 409);

    const now = new Date();
    let update;
    if (tier === "subscription") {
      const currentEnd = designer.subscription_end ? new Date(designer.subscription_end) : now;
      const baseDate = currentEnd > now ? currentEnd : now;
      const newEndDate = new Date(baseDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      update = {
        is_subscription_active: true,
        subscription_start: now.toISOString(),
        subscription_end: newEndDate.toISOString(),
      };
    } else {
      const days = tier === "featured_90" ? 90 : tier === "featured_365" ? 365 : 30;
      update = {
        featured_status: "featured",
        featured_expiry: new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from("designers")
      .update(update)
      .eq("id", designer_id)
      .eq("user_id", authData.user.id);
    if (updateError) throw updateError;

    const { error: historyError } = await supabaseAdmin.from("payment_history").insert({
      designer_id,
      payment_type: tier,
      amount: expectedAmount / 100,
      currency: "INR",
      gateway_transaction_id: razorpay_payment_id,
      status: "success",
      duration_days: tier === "subscription" ? 365 : tier === "featured_30" ? 30 : tier === "featured_90" ? 90 : 365,
    });
    if (historyError) throw historyError;

    return jsonResponse({ success: true, message: "Payment verified and subscription updated." }, 200);
  } catch {
    return jsonResponse({ error: "Payment verification failed." }, 500);
  }
});
