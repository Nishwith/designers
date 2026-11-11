import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Authentication required." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Edge function is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, 503);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse({ error: `Invalid session: ${authError?.message || "User not found"}` }, 401);
    }

    // Verify admin access: check configured ADMIN_USER_IDS if present,
    // or verify caller's role is 'admin' from users table / JWT metadata.
    const configuredAdmins = Deno.env.get("ADMIN_USER_IDS");
    const adminIds = configuredAdmins
      ? new Set(configuredAdmins.split(",").map((id) => id.trim()).filter(Boolean))
      : null;

    let isAuthorizedAdmin = false;
    if (adminIds && adminIds.has(authData.user.id)) {
      isAuthorizedAdmin = true;
    } else {
      const { data: callerProfile } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (
        callerProfile?.role === "admin" ||
        authData.user.app_metadata?.role === "admin" ||
        authData.user.user_metadata?.role === "admin"
      ) {
        isAuthorizedAdmin = true;
      }
    }

    if (!isAuthorizedAdmin) {
      return jsonResponse({ error: "Administrator access required." }, 403);
    }

    const body = await req.json();

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = (typeof body.name === "string" && body.name.trim()) ||
                 (typeof body.org_name === "string" && body.org_name.trim()) ||
                 (typeof body.full_name === "string" && body.full_name.trim()) || "";
    const fullName = (typeof body.full_name === "string" && body.full_name.trim()) || name;
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const designerType = typeof body.designer_type === "string" ? body.designer_type : "interior";
    const experienceYears = Math.max(0, parseInt(body.experience_years, 10) || 0);
    const projectsCompleted = Math.max(0, parseInt(body.projects_completed, 10) || 0);
    const aboutText = typeof body.about_text === "string" ? body.about_text.trim() : "";
    const styleTags = Array.isArray(body.style_tags) ? body.style_tags : [];

    // Support video_link_1, video_link, and video_link_2
    const videoLink1 = typeof body.video_link_1 === "string" && body.video_link_1.trim()
      ? body.video_link_1.trim()
      : (typeof body.video_link === "string" && body.video_link.trim() ? body.video_link.trim() : null);
    const videoLink2 = typeof body.video_link_2 === "string" && body.video_link_2.trim()
      ? body.video_link_2.trim()
      : null;

    const logoUrl = typeof body.logo_url === "string" && body.logo_url.trim() ? body.logo_url.trim() : null;

    // Service Area Coordinates
    const serviceAreaLat = parseFloat(body.service_area_lat);
    const serviceAreaLng = parseFloat(body.service_area_lng);
    const hasCoordinates = !isNaN(serviceAreaLat) && !isNaN(serviceAreaLng);
    const pointLocation = hasCoordinates ? `POINT(${serviceAreaLng} ${serviceAreaLat})` : null;

    if (!email || !password || password.length < 6 || !name) {
      return jsonResponse({ error: "Valid email, password (min 6 characters), and designer/agency name are required." }, 400);
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, city },
    });
    if (createError || !created.user) {
      return jsonResponse({ error: createError?.message ?? "Could not create authentication user." }, 400);
    }

    const userId = created.user.id;

    // Initialize public.users record
    const userUpdates: Record<string, unknown> = {
      role: "designer",
      full_name: fullName,
      phone,
      city,
      profile_completed: true,
    };
    if (pointLocation) {
      userUpdates.location = pointLocation;
    }

    const { error: profileError } = await supabaseAdmin
      .from("users")
      .update(userUpdates)
      .eq("id", userId);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return jsonResponse({ error: `Could not create user profile: ${profileError.message}` }, 500);
    }

    // Insert public.designers record mapping all fields accurately
    const designerRecord: Record<string, unknown> = {
      user_id: userId,
      email,
      name,
      city,
      phone,
      designer_type: designerType,
      experience_years: experienceYears,
      projects_completed: projectsCompleted,
      about_text: aboutText,
      logo_url: logoUrl,
      style_tags: styleTags,
      video_link: videoLink1,
      video_link_2: videoLink2,
      is_verified: true, // Automatically verified for VIP
      featured_status: typeof body.featured_status === "string" ? body.featured_status : "standard",
      is_subscription_active: false, // Default VIP pending payment status
      is_public: false,
    };
    if (pointLocation) {
      designerRecord.location_coords = pointLocation;
    }

    const { error: designerError } = await supabaseAdmin
      .from("designers")
      .insert(designerRecord);

    if (designerError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return jsonResponse({ error: `Could not create designer record: ${designerError.message}` }, 500);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Admin onboarding failed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
