import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIER_PRICES: Record<string, number> = {
  subscription: 500000,   // ₹5000 in paise
  featured_30: 99900,     // ₹999 in paise
  featured_90: 249900,    // ₹2499 in paise
  featured_365: 899900,   // ₹8999 in paise
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tier } = await req.json();

    const amount = TIER_PRICES[tier];
    if (!amount) {
      throw new Error(`Invalid pricing tier: ${tier}`);
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new Error('Razorpay API keys not configured on server.');
    }

    const authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`;

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
      }),
    });

    const orderData = await response.json();

    if (!response.ok) {
      throw new Error(orderData.error?.description || 'Failed to create Razorpay order');
    }

    return new Response(
      JSON.stringify({
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
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
