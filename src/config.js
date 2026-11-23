/**
 * Single source of truth for all environment variables.
 * Every import.meta.env read lives here — nowhere else.
 */
export const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const MEDIA_BASE_URL   = import.meta.env.VITE_MEDIA_BASE_URL || '';
export const MAIN_APP_URL     = (import.meta.env.VITE_MAIN_APP_URL || "https://vishwakarmans.com").replace(/\/+$/, "");
export const DESIGNER_APP_URL = (import.meta.env.VITE_DESIGNER_APP_URL || "https://designers.vishwakarmans.com").replace(/\/+$/, "");

/**
 * Prefix a relative storage path with the media base URL.
 * Storage paths are always relative (/portfolios/uuid/cover.webp);
 * this prepends the CDN origin at the UI layer.
 *
 * @param {string} relativePath
 * @returns {string} Full public URL
 */
export const mediaUrl = (relativePath) =>
  relativePath ? `${MEDIA_BASE_URL}${relativePath}` : '';
