import { supabase } from './supabaseClient';

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

/** Upload a file to the portfolio bucket. Returns the public URL. */
export const uploadPortfolioFile = async (path, file) => {
  const { error } = await supabase.storage.from('portfolio').upload(path, file);
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

/** Delete existing connection, then insert a fresh one. */
export const upsertConnection = async (clientId, designerId, payload) => {
  await supabase.from('connections').delete()
    .eq('client_id', clientId)
    .eq('designer_id', designerId);
  const { data, error } = await supabase
    .from('connections')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
};

/** Update connection status. */
export const updateConnection = async (id, updates) => {
  const { error } = await supabase
    .from('connections')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
};

/** Delete a connection. */
export const deleteConnection = async (id) => {
  const { error } = await supabase.from('connections').delete().eq('id', id);
  if (error) throw error;
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


