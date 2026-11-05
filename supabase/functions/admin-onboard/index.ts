import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Authentication required." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const configuredAdmins = Deno.env.get("ADMIN_USER_IDS");
  if (!supabaseUrl || !serviceRoleKey || !configuredAdmins) {
    return jsonResponse({ error: "Admin onboarding is not configured." }, 503);
  }

  const adminIds = new Set(configuredAdmins.split(",").map((id) => id.trim()).filter(Boolean));
  if (adminIds.size === 0) return jsonResponse({ error: "Admin onboarding is not configured." }, 503);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) return jsonResponse({ error: "Invalid session." }, 401);
    if (!adminIds.has(authData.user.id)) return jsonResponse({ error: "Administrator access required." }, 403);

    const {
      email, password, full_name, org_name, city, phone,
      designer_type, experience_years, bio, about_text,
      logo_url, is_verified, featured_status,
    } = await req.json();

    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || password.length < 8 ||
      typeof full_name !== "string" || !full_name.trim() || typeof org_name !== "string" || !org_name.trim()) {
      return jsonResponse({ error: "Valid email, password, name, and organization are required." }, 400);
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), phone, city },
    });
    if (createError || !created.user) {
      return jsonResponse({ error: createError?.message ?? "Could not create account." }, 400);
    }

    const userId = created.user.id;
    const { error: profileError } = await supabaseAdmin.from("users").update({
      role: "designer", full_name: full_name.trim(), phone, city,
    }).eq("id", userId);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return jsonResponse({ error: "Could not create designer profile." }, 500);
    }

    const { error: designerError } = await supabaseAdmin.from("designers").insert({
      user_id: userId,
      email: email.trim(),
      name: org_name.trim(),
      city,
      phone,
      designer_type,
      experience_years,
      bio,
      about_text,
      logo_url,
      is_verified: is_verified === true,
      featured_status,
    });

    if (designerError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return jsonResponse({ error: "Could not create designer profile." }, 500);
    }

    return jsonResponse({ success: true, user_id: userId }, 200);
  } catch {
    return jsonResponse({ error: "Admin onboarding failed." }, 500);
  }
});
