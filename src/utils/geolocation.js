/**
 * Shared Geolocation & Reverse-Geocoding Utilities
 * Fast, non-hanging cross-browser location strategy (Safari, Brave, Mobile, Desktop).
 */

export const DEFAULT_COORDINATES = {
  latitude: 17.3850,
  longitude: 78.4867,
  city: "Hyderabad",
  approximate: true,
  isFallback: true,
};

/**
 * Fetch approximate location using HTTPS IP-based lookup with strict 4-second timeout.
 * Primary: get.geojs.io, Fallback: ipapi.co.
 */
export async function fetchIpLocation(timeoutMs = 4000) {
  const endpoints = [
    {
      url: "https://get.geojs.io/v1/ip/geo.json",
      parse: (d) => ({
        latitude: parseFloat(d.latitude),
        longitude: parseFloat(d.longitude),
        city: d.city || "",
      }),
    },
    {
      url: "https://ipapi.co/json/",
      parse: (d) => ({
        latitude: parseFloat(d.latitude),
        longitude: parseFloat(d.longitude),
        city: d.city || "",
      }),
    },
  ];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(endpoint.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const parsed = endpoint.parse(data);
        if (!isNaN(parsed.latitude) && !isNaN(parsed.longitude)) {
          return {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            city: parsed.city,
            approximate: true,
            isFallback: true,
            source: "ip",
          };
        }
      }
    } catch {
      // Ignore and proceed to next fallback
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    ...DEFAULT_COORDINATES,
    source: "default",
  };
}

/**
 * Reverse geocode latitude and longitude to a human-readable city/address.
 * Uses Nominatim with strict 5-second AbortController timeout. Never throws.
 */
export async function reverseGeocode(latitude, longitude, timeoutMs = 5000) {
  if (latitude == null || longitude == null) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      latitude
    )}&lon=${encodeURIComponent(longitude)}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const address = data.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.suburb ||
      address.state_district ||
      "";
    return {
      city,
      displayName: data.display_name || "",
      address,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fast, non-hanging geolocation strategy:
 * 1. navigator.geolocation.getCurrentPosition with enableHighAccuracy: false, timeout: 8000.
 * 2. If TIMEOUT (code 3) or POSITION_UNAVAILABLE (code 2), cleanly falls back to IP-based lookup.
 * 3. If PERMISSION_DENIED (code 1), does NOT hang; rejects with an actionable error.
 */
export async function getCurrentLocation(options = {}) {
  if (typeof window === "undefined" || !navigator?.geolocation) {
    return await fetchIpLocation();
  }

  return new Promise((resolve, reject) => {
    const geoOptions = {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000,
      ...options,
    };

    let settled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          approximate: false,
          isFallback: false,
          source: "gps",
        });
      },
      async (geoError) => {
        if (settled) return;
        settled = true;

        // User explicitly denied permission
        if (geoError?.code === 1 || geoError?.code === geoError?.PERMISSION_DENIED) {
          const err = new Error(
            "Location permission denied. Please allow location access in your browser settings or select your city manually."
          );
          err.code = 1;
          err.isDenied = true;
          return reject(err);
        }

        // POSITION_UNAVAILABLE (code 2) or TIMEOUT (code 3) -> Fallback to IP geolocation
        try {
          const ipLoc = await fetchIpLocation();
          resolve(ipLoc);
        } catch {
          resolve({
            ...DEFAULT_COORDINATES,
            source: "default",
          });
        }
      },
      geoOptions
    );
  });
}
