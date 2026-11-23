import { supabase } from '../services/supabaseClient';
import { SUPABASE_URL, MEDIA_BASE_URL } from '../config';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/webm',
];

const MAX_IMAGE_SIZE_BYTES = 10485760; // 10MB

/**
 * Upload a media file to Cloudflare R2 via presigned PUT URL.
 * 
 * @param {File|Blob} file 
 * @param {string} folder - 'portfolios', 'logos', 'profiles', or 'videos'
 * @returns {Promise<string>} Full public URL of the uploaded object
 */
export const uploadToR2 = async (file, folder = 'portfolios') => {
  // Support flexible argument ordering (file, folder) or legacy (path, file)
  let uploadFile = file;
  let targetFolder = folder;
  if (!(uploadFile instanceof Blob) && uploadFile?.size === undefined && (folder instanceof Blob || folder?.size !== undefined)) {
    uploadFile = folder;
    targetFolder = typeof file === 'string' && file.includes('logo') ? 'logos' : 'portfolios';
  }

  if (!uploadFile) {
    throw new Error('No file provided for upload.');
  }

  if (uploadFile.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`File "${uploadFile.name || 'selected file'}" exceeds the 10MB limit.`);
  }

  if (uploadFile.type && !ALLOWED_MIME_TYPES.includes(uploadFile.type)) {
    throw new Error(
      `File "${uploadFile.name || 'selected file'}" has unsupported MIME type "${uploadFile.type}". Allowed types: JPEG, PNG, WebP, AVIF, MP4, WebM.`
    );
  }

  const fileName = uploadFile.name || `file_${Date.now()}`;
  const contentType = uploadFile.type || 'image/jpeg';

  const { data, error } = await supabase.functions.invoke('get-r2-upload-url', {
    body: {
      fileName,
      contentType,
      folder: targetFolder,
      fileSize: uploadFile.size,
    },
  });

  if (error || !data?.uploadUrl) {
    throw new Error(error?.message || 'Failed to generate secure upload URL.');
  }

  const res = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: uploadFile,
  });

  if (!res.ok) {
    throw new Error(`Upload failed with status ${res.status}: ${res.statusText}`);
  }

  return data.publicUrl;
};

/**
 * Delete a file or array of files from Cloudflare R2.
 * 
 * @param {string|string[]} publicUrlOrKey 
 * @returns {Promise<any>}
 */
export const deleteFromR2 = async (publicUrlOrKey) => {
  if (!publicUrlOrKey) return null;

  if (Array.isArray(publicUrlOrKey)) {
    return Promise.allSettled(publicUrlOrKey.map((item) => deleteFromR2(item)));
  }

  const isUrl =
    typeof publicUrlOrKey === 'string' &&
    (publicUrlOrKey.startsWith('http://') || publicUrlOrKey.startsWith('https://'));

  const payload = isUrl ? { publicUrl: publicUrlOrKey } : { key: publicUrlOrKey };

  const { data, error } = await supabase.functions.invoke('delete-r2-file', {
    body: payload,
  });

  if (error) {
    console.error('deleteFromR2 error:', error);
    return null;
  }

  return data;
};

/**
 * Resolves a stored media path or URL to a fully qualified URL.
 * If already an absolute URL (http:// or https://), returns it as-is.
 * Otherwise falls back to CDN or Supabase public URL so legacy records never break.
 * 
 * @param {string} urlOrPath 
 * @returns {string} Fully qualified URL
 */
export const resolveMediaUrl = (urlOrPath) => {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  const trimmed = urlOrPath.trim();
  if (/^(?:https?:|\/\/|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  if (MEDIA_BASE_URL) {
    const base = MEDIA_BASE_URL.replace(/\/+$/, '');
    const cleanPath = trimmed.replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
  }
  if (SUPABASE_URL) {
    const base = SUPABASE_URL.replace(/\/+$/, '');
    const cleanPath = trimmed.replace(/^\/+/, '');
    const pathWithBucket = cleanPath.startsWith('portfolio/') ? cleanPath : `portfolio/${cleanPath}`;
    return `${base}/storage/v1/object/public/${pathWithBucket}`;
  }
  return trimmed;
};
