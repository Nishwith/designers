import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      tier,
      designer_id,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !tier || !designer_id) {
      throw new Error("Missing required payment verification parameters.");
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured on server.");
    }

    // Verify HMAC-SHA256 signature using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keySecret);
    const messageData = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Invalid Razorpay payment signature.");
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();

    if (tier === 'subscription') {
      const { data: currentDesigner } = await supabaseAdmin
        .from('designers')
        .select('subscription_end')
        .eq('id', designer_id)
        .single();

      let baseDate = now;
      if (currentDesigner?.subscription_end) {
        const currentEnd = new Date(currentDesigner.subscription_end);
        if (currentEnd > now) baseDate = currentEnd;
      }
      const newEndDate = new Date(baseDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      const { error: updateError } = await supabaseAdmin
        .from('designers')
        .update({
          is_subscription_active: true,
          subscription_start: now.toISOString(),
          subscription_end: newEndDate.toISOString(),
          is_public: true,
        })
        .eq('id', designer_id);

      if (updateError) throw updateError;
    } else if (tier.startsWith('featured_')) {
      let days = 30;
      if (tier === 'featured_90') days = 90;
      if (tier === 'featured_365') days = 365;

      const expiryDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const { error: updateError } = await supabaseAdmin
        .from('designers')
        .update({
          featured_status: 'featured',
          featured_expiry: expiryDate.toISOString(),
        })
        .eq('id', designer_id);

      if (updateError) throw updateError;
    } else {
      throw new Error(`Unsupported tier: ${tier}`);
    }

    // Log transaction into payment_history table
    await supabaseAdmin.from('payment_history').insert({
      designer_id: designer_id,
      payment_type: tier,
      amount: tier === 'subscription' ? 5000 : 0,
      currency: 'INR',
      gateway_transaction_id: razorpay_payment_id,
      status: 'success',
      duration_days: tier === 'subscription' ? 365 : 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and status updated successfully.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
