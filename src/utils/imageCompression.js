/**
 * Resilient multi-tier image compression utility.
 * Enforces Vishwakarmans portfolio bucket storage rules:
 * - Max dimension: 2048px (aspect ratio preserved)
 * - Preferred format: image/webp (Quality 0.82)
 * - Fallback format: image/jpeg (Quality 0.82)
 * - Strict whitelist: image/jpeg, image/png, image/webp, image/avif
 * - Size limit: <= 10MB (10,485,760 bytes)
 */

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

export const MAX_IMAGE_SIZE_BYTES = 10485760; // 10MB

/**
 * Calculates scaled dimensions preserving aspect ratio within max boundaries.
 */
function calculateDimensions(width, height, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Tier 1: Compress using createImageBitmap + OffscreenCanvas -> WebP.
 */
async function compressWithOffscreenCanvas(file, maxWidth, maxHeight, quality) {
  if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('OffscreenCanvas or createImageBitmap not supported');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = calculateDimensions(bitmap.width, bitmap.height, maxWidth, maxHeight);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context on OffscreenCanvas');

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
    if (!blob || blob.size === 0) {
      throw new Error('OffscreenCanvas produced an empty blob');
    }

    const mimeType = blob.type || 'image/webp';
    const ext = mimeType === 'image/webp' ? '.webp' : mimeType === 'image/png' ? '.png' : '.jpg';
    const baseName = file.name ? file.name.replace(/\.[^.]+$/, '') : 'image';

    return new File([blob], `${baseName}${ext}`, {
      type: mimeType,
      lastModified: Date.now(),
    });
  } finally {
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
}

/**
 * Tier 2: Fallback compression using standard HTMLCanvasElement -> JPEG.
 */
function compressWithHTMLCanvas(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    // ponytail: In Node/JSDOM testing environments, Image element does not load object URLs
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      typeof document.createElement !== 'function' ||
      (typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom'))
    ) {
      return reject(new Error('HTMLCanvasElement not supported in this environment'));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    // Safety timeout to prevent hanging on unresponsive image decoders
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image decoding timed out in canvas fallback'));
      }
    }, 3000);

    const cleanup = () => {
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = () => {
      if (settled) return;
      cleanup();
      try {
        const { width, height } = calculateDimensions(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          maxWidth,
          maxHeight
        );
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to get 2d context on HTMLCanvasElement'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size === 0) {
              return reject(new Error('HTMLCanvasElement produced an empty blob'));
            }

            const mimeType = blob.type || 'image/jpeg';
            const ext = mimeType === 'image/jpeg' ? '.jpg' : '.png';
            const baseName = file.name ? file.name.replace(/\.[^.]+$/, '') : 'image';

            resolve(
              new File([blob], `${baseName}${ext}`, {
                type: mimeType,
                lastModified: Date.now(),
              })
            );
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      if (settled) return;
      cleanup();
      reject(new Error(`Failed to load image for canvas compression: ${err?.message || 'invalid image'}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses an image file with multi-tier fallbacks.
 *
 * @param {File} file - Original image file
 * @param {object} [opts]
 * @param {number} [opts.maxWidth=2048]
 * @param {number} [opts.maxHeight=2048]
 * @param {number} [opts.quality=0.82]
 * @returns {Promise<File>} Compressed File compliant with portfolio storage rules
 */
export async function compressImage(
  file,
  { maxWidth = 2048, maxHeight = 2048, quality = 0.82 } = {}
) {
  if (!file) {
    throw new Error('No file provided for compression.');
  }

  // Tier 1: Try OffscreenCanvas with WebP
  try {
    const result = await compressWithOffscreenCanvas(file, maxWidth, maxHeight, quality);
    if (ALLOWED_IMAGE_MIME_TYPES.includes(result.type) && result.size <= MAX_IMAGE_SIZE_BYTES) {
      return result;
    }
  } catch {
    // Tier 1 failed; fall through to Tier 2
  }

  // Tier 2: Try standard DOM HTMLCanvasElement with JPEG
  try {
    const result = await compressWithHTMLCanvas(file, maxWidth, maxHeight, quality);
    if (ALLOWED_IMAGE_MIME_TYPES.includes(result.type) && result.size <= MAX_IMAGE_SIZE_BYTES) {
      return result;
    }
  } catch {
    // Tier 2 failed; fall through to Tier 3 fallback evaluation
  }

  // Tier 3: If all compression fails, return original file ONLY if it satisfies strict portfolio limits
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.type) && file.size <= MAX_IMAGE_SIZE_BYTES) {
    return file;
  }

  // File cannot be safely used
  const fileName = file.name || 'selected file';
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `File "${fileName}" has an unsupported format ("${file.type || 'unknown'}"). Supported formats are JPEG, PNG, WebP, and AVIF.`
    );
  }

  throw new Error(
    `File "${fileName}" exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB) and could not be compressed.`
  );
}
