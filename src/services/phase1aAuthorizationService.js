export const isAdminAuthorizationRpcEnabled = () =>
  import.meta.env.VITE_PHASE1A_ADMIN_AUTH_RPC_ENABLED === "true";

export async function checkServerAdminAuthorization(supabase) {
  if (!isAdminAuthorizationRpcEnabled()) return { enabled: false, authorized: false };
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw error;
  if (typeof data !== "boolean") throw new Error("Admin authorization RPC returned an invalid response.");
  return { enabled: true, authorized: data };
}

export const isAdminRoleHint = (profile) => profile?.role === "admin";
