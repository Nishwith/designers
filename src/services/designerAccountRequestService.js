export const isSecureDesignerRequestRpcEnabled = () =>
  import.meta.env.VITE_PHASE1A_DESIGNER_REQUEST_RPC_ENABLED === "true";

const REQUEST_RPCS = {
  renewal: "designer_request_renewal",
  featured: "designer_request_featured",
};

export async function submitDesignerAccountRequest(supabase, kind) {
  if (!REQUEST_RPCS[kind]) throw new Error("Unsupported designer account request.");
  if (!isSecureDesignerRequestRpcEnabled()) {
    throw new Error("This request is unavailable until its secure workflow is deployed.");
  }
  const { data, error } = await supabase.rpc(REQUEST_RPCS[kind]);
  if (error) throw error;
  if (data !== true) throw new Error("The secure request workflow did not confirm the request.");
  return true;
}
