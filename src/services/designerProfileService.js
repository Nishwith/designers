const PROFILE_FIELDS = new Set([
  "name", "city", "email", "phone", "designer_type", "about_text", "logo_url",
  "video_link", "video_link_1", "video_link_2", "style_tags", "experience_years", "projects_completed", "website_url",
  "videos_approved", "video_status",
]);

export async function updateOwnDesignerProfile(supabase, userId, designerId, updates) {
  if (!userId || !designerId) throw new Error("Authenticated user and designer IDs are required.");
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new Error("Designer profile updates must be an object.");
  }
  const forbidden = Object.keys(updates).filter((field) => !PROFILE_FIELDS.has(field));
  if (forbidden.length) throw new Error(`Designer profile update contains protected fields: ${forbidden.join(", ")}`);

  const authResponse = typeof supabase.auth?.getUser === "function"
    ? await supabase.auth.getUser()
    : await supabase.auth?.getSession?.();
  const user = authResponse?.data?.user || authResponse?.data?.session?.user;
  if (!user || user.id !== userId) throw new Error("Designer profile updates are limited to the authenticated owner.");

  const { data, error } = await supabase
    .from("designers")
    .update(updates)
    .eq("id", designerId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No owned designer profile was updated.");
  return data;
}

export const isDesignerSelfHideRpcEnabled = () =>
  import.meta.env.VITE_PHASE1A_SELF_HIDE_RPC_ENABLED === "true";

export async function hideOwnDesignerProfile(supabase, designerId) {
  if (!isDesignerSelfHideRpcEnabled()) {
    throw new Error("Profile hiding is unavailable until the secure self-hide workflow is deployed.");
  }
  if (!designerId) throw new Error("A designer ID is required.");
  const { data, error } = await supabase.rpc("designer_hide_own_profile");
  if (error) throw error;
  if (data !== true) throw new Error("The secure self-hide workflow did not confirm the change.");
  return { id: designerId, is_public: false };
}
