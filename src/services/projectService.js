import { supabase } from './supabaseClient';
import { submitOrReopenInquiry, archiveInquiry } from './designerInquiryService';

// ── Designers ────────────────────────────────────────────────────────────

/** Fetch a single designer by id. */
export const getDesigner = async (designerId) => {
  const { data, error } = await supabase
    .from('designers')
    .select('*')
    .eq('id', designerId)
    .single();
  if (error) throw error;
  return data;
};

/** Fetch all public/approved designers with nested projects + images. */
export const getDesignersList = async () => {
  const { data, error } = await supabase
    .from('designers')
    .select(`*, designer_projects ( project_category, project_images ( image_url, is_cover ) )`)
    .eq('status', 'approved');
  if (error) throw error;
  return data;
};

// ── Projects ─────────────────────────────────────────────────────────────

/** Fetch projects for a designer, newest first, with images. */
export const getProjectsByDesigner = async (designerId) => {
  const { data, error } = await supabase
    .from('designer_projects')
    .select('*, project_images(image_url, is_cover, room_category)')
    .eq('designer_id', designerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

/** Insert a new project. Returns the created row. */
export const createProject = async (payload) => {
  const { data, error } = await supabase
    .from('designer_projects')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

/** Delete a project by id. */
export const deleteProject = async (projectId) => {
  const { error } = await supabase
    .from('designer_projects')
    .delete()
    .eq('id', projectId);
  if (error) throw error;
};

// ── Project Images ───────────────────────────────────────────────────────

/** Bulk insert image rows. */
export const insertProjectImages = async (rows) => {
  const { error } = await supabase.from('project_images').insert(rows);
  if (error) throw error;
};

// ── Storage ──────────────────────────────────────────────────────────────

/** Upload a file to the portfolio bucket with client-side size and MIME validation. Returns the public URL. */
export const uploadPortfolioFile = async (path, file) => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const MAX_PORTFOLIO_SIZE_BYTES = 10485760; // 10MB
  if (file.size > MAX_PORTFOLIO_SIZE_BYTES) {
    throw new Error(`File "${file.name || 'selected file'}" exceeds the 10MB limit.`);
  }

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `File "${file.name || 'selected file'}" has unsupported MIME type "${file.type}". Allowed types: JPEG, PNG, WebP, AVIF.`
    );
  }

  const { error } = await supabase.storage.from('portfolio').upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
};

// ── Connections ──────────────────────────────────────────────────────────

/** Fetch the latest connection between a client and designer. */
export const getConnection = async (clientId, designerId) => {
  const { data } = await supabase
    .from('connections')
    .select('*')
    .eq('client_id', clientId)
    .eq('designer_id', designerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
};

/** Submit or reopen existing connection (Option B inquiry lifecycle: preserves connection ID and status transition). */
export const upsertConnection = async (clientId, designerId, payload) => {
  const result = await submitOrReopenInquiry(supabase, {
    designerId,
    clientName: payload?.client_name,
    clientEmail: payload?.client_email,
    clientPhone: payload?.client_phone,
    message: payload?.message || "Inquiry submission",
  });
  return result.data || { id: result.connection_id, status: result.status, ...payload };
};

/** Update connection status. */
export const updateConnection = async (id, updates) => {
  const { error } = await supabase
    .from('connections')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
};

/** Archive a connection instead of physical deletion (preserves history). */
export const deleteConnection = async (id) => {
  return archiveInquiry(supabase, id);
};

// ── Reviews ──────────────────────────────────────────────────────────────

/** Fetch reviews for a designer, newest first. */
export const getReviewsByDesigner = async (designerId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('designer_id', designerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

/** Submit a review. */
export const createReview = async (payload) => {
  const { error } = await supabase.from('reviews').insert(payload);
  if (error) throw error;
};


