const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

/**
 * Extracts and returns a valid YouTube embed URL from various YouTube formats.
 * Accepts youtu.be/XYZ, youtube.com/watch?v=XYZ, /embed/XYZ, /shorts/XYZ, /live/XYZ.
 */
export const getYouTubeEmbedUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())
    ) {
      return null;
    }

    let videoId = null;
    if (url.hostname.toLowerCase() === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || null;
    } else if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else {
      videoId = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] || null;
    }

    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
};

