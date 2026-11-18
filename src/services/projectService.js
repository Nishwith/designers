import { supabase } from './supabaseClient';
import { submitOrReopenInquiry, archiveInquiry } from './designerInquiryService';
import { uploadToR2, deleteFromR2, resolveMediaUrl } from '../utils/r2Storage';

export { uploadToR2, deleteFromR2, resolveMediaUrl };

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

/** Upload a file to Cloudflare R2 storage with client-side size and MIME validation. Returns the public URL. */
export const uploadPortfolioFile = async (path, file) => {
  const actualFile = (file instanceof Blob || (file && file.size !== undefined)) ? file : path;
  const folder = (typeof path === 'string' && path.includes('logo')) ? 'logos' : 'portfolios';
  return uploadToR2(actualFile, folder);
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


