import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const prices: Record<string, number> = {
  subscription: 500000,
  featured_30: 99900,
  featured_90: 249900,
  featured_365: 899900,
};

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return jsonResponse({ error: "Missing Razorpay webhook signature." }, 401);
    }

    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Webhook service configuration missing." }, 503);
    }

    // 1. Cryptographic HMAC-SHA256 signature verification
    const signatureKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      signatureKey,
      new TextEncoder().encode(rawBody)
    );
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== signature) {
      return jsonResponse({ error: "Invalid webhook signature." }, 401);
    }

    // 2. Parse verified payload
    const event = JSON.parse(rawBody);
    const eventType = event.event;

    // Only process relevant payment & order events
    if (eventType !== "payment.captured" && eventType !== "order.paid") {
      return jsonResponse({ received: true, ignored: `Event ${eventType} not handled.` }, 200);
    }

    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;

    const paymentId = paymentEntity?.id;
    const orderId = orderEntity?.id || paymentEntity?.order_id;
    const notes = orderEntity?.notes || paymentEntity?.notes || {};

    const tier = String(notes.tier || "");
    const designerId = parseInt(notes.designer_id, 10);
    const userId = notes.user_id ? String(notes.user_id) : null;
    const expectedAmount = prices[tier];

    if (!designerId || !tier || !expectedAmount) {
      return jsonResponse({ received: true, ignored: "Missing required notes (tier, designer_id)." }, 200);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Strictly Idempotent: check if transaction was already recorded
    if (paymentId) {
      const { data: existingPayment, error: lookupError } = await supabaseAdmin
        .from("payment_history")
        .select("gateway_transaction_id")
        .eq("gateway_transaction_id", paymentId)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (existingPayment) {
        return jsonResponse({ received: true, message: "Payment already processed." }, 200);
      }
    }

    // 4. Fetch designer row and verify existence & ownership
    const { data: designer, error: designerError } = await supabaseAdmin
      .from("designers")
      .select("id, user_id, subscription_end, is_verified")
      .eq("id", designerId)
      .maybeSingle();

    if (designerError) throw designerError;
    if (!designer) {
      return jsonResponse({ received: true, error: "Designer record not found." }, 200);
    }

    if (userId && designer.user_id !== userId) {
      return jsonResponse({ received: true, error: "User ID does not match designer owner." }, 200);
    }

    // 5. Compute updated dates
    const now = new Date();
    let update: Record<string, unknown>;

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

    // 6. Update designer record
    const { error: updateError } = await supabaseAdmin
      .from("designers")
      .update(update)
      .eq("id", designerId);

    if (updateError) throw updateError;

    // 7. Insert payment_history record
    const { error: historyError } = await supabaseAdmin.from("payment_history").insert({
      designer_id: designerId,
      payment_type: tier,
      amount: expectedAmount / 100,
      currency: "INR",
      gateway_transaction_id: paymentId || orderId || `order_${Date.now()}`,
      status: "success",
      duration_days: tier === "subscription" ? 365 : tier === "featured_30" ? 30 : tier === "featured_90" ? 90 : 365,
    });

    if (historyError) throw historyError;

    return jsonResponse({ received: true, success: true }, 200);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Internal webhook error" }, 500);
  }
});
