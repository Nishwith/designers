export const isInquiryRpcEnabled = () =>
  import.meta.env.VITE_PHASE1A_INQUIRY_RPC_ENABLED === "true";

/**
 * Option B: Submits a new inquiry or reopens an existing one for the authenticated client.
 * Strictly uses the secure server RPC; zero client-side direct table mutations or fallbacks.
 *
 * @param {object} supabase - Supabase client instance
 * @param {object} params
 * @param {number|string} params.designerId - Target designer ID
 * @param {string} [params.clientName] - Client contact name
 * @param {string} [params.clientEmail] - Client contact email
 * @param {string} [params.clientPhone] - Client contact phone
 * @param {string} params.message - Inquiry message content
 * @returns {Promise<{action: 'created'|'reopened', connection_id: number, status: string}>}
 */
export async function submitOrReopenInquiry(
  supabase,
  { designerId, clientName, clientEmail, clientPhone, message }
) {
  if (!supabase) throw new Error("Supabase client is required.");

  if (!designerId) throw new Error("A target designer ID is required.");
  const parsedDesignerId = Number(designerId);
  if (!Number.isSafeInteger(parsedDesignerId) || parsedDesignerId <= 0) {
    throw new Error("A valid designer ID is required.");
  }

  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  if (!trimmedMessage) {
    throw new Error("Inquiry message cannot be empty.");
  }

  // Fail-closed gate: Direct client table writes are prohibited
  if (!isInquiryRpcEnabled()) {
    throw new Error(
      "Inquiry submission is unavailable until the secure server inquiry operation is enabled (VITE_PHASE1A_INQUIRY_RPC_ENABLED=true)."
    );
  }

  const { data, error } = await supabase.rpc("submit_or_reopen_designer_inquiry", {
    p_designer_id: parsedDesignerId,
    p_client_name: clientName?.trim() || null,
    p_client_email: clientEmail?.trim() || null,
    p_client_phone: clientPhone?.trim() || null,
    p_message: trimmedMessage,
  });

  if (error) throw error;
  if (!data || !data.connection_id) {
    throw new Error("Inquiry operation did not return a valid connection record.");
  }
  return data;
}

/**
 * Archives an inquiry using the secure RPC instead of physical deletion.
 * Preserves history and fails closed without direct table mutations.
 */
export async function archiveInquiry(supabase, connectionId) {
  if (!supabase) throw new Error("Supabase client is required.");
  if (!connectionId) throw new Error("A connection ID is required.");

  const parsedId = Number(connectionId);
  if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
    throw new Error("A valid connection ID is required.");
  }

  if (!isInquiryRpcEnabled()) {
    throw new Error(
      "Inquiry archiving requires the secure server inquiry RPC (VITE_PHASE1A_INQUIRY_RPC_ENABLED=true). Direct deletion has been removed for security compliance."
    );
  }

  const { data, error } = await supabase.rpc("designer_archive_connection", {
    p_connection_id: parsedId,
  });

  if (error) throw error;
  if (!data || data.status !== "archived") {
    throw new Error("Inquiry archive RPC did not confirm the archived status.");
  }
  return data;
}
