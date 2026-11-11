import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  compressImage,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '../utils/imageCompression';
import { uploadPortfolioFile } from '../services/projectService';
import { supabase } from '../services/supabaseClient';

vi.mock('../services/supabaseClient', () => {
  const uploadMock = vi.fn();
  const getPublicUrlMock = vi.fn(() => ({
    data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/portfolio/test.webp' },
  }));

  return {
    supabase: {
      storage: {
        from: vi.fn(() => ({
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        })),
      },
    },
  };
});

describe('Phase 2: Image Compression & Storage Service Refactoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compressImage()', () => {
    it('returns an allowed image intact if already <= 10MB and canvas is not available in node/jsdom', async () => {
      const file = new File(['small dummy content'], 'room.jpg', { type: 'image/jpeg' });
      const result = await compressImage(file);
      expect(result).toBeDefined();
      expect(result.type).toBe('image/jpeg');
      expect(result.size).toBeLessThanOrEqual(MAX_IMAGE_SIZE_BYTES);
      expect(ALLOWED_IMAGE_MIME_TYPES).toContain(result.type);
    });

    it('rejects unsupported image MIME types like image/heic or image/bmp', async () => {
      const heicFile = new File(['heic data'], 'photo.heic', { type: 'image/heic' });
      await expect(compressImage(heicFile)).rejects.toThrow(/unsupported format/i);
    });

    it('rejects files exceeding 10MB that cannot be compressed', async () => {
      // Create a mock large file > 10MB
      const largeContent = new Uint8Array(10485761);
      const largeFile = new File([largeContent], 'giant.png', { type: 'image/png' });

      await expect(compressImage(largeFile)).rejects.toThrow(/exceeds the 10MB limit/i);
    });
  });

  describe('uploadPortfolioFile()', () => {
    it('throws when file exceeds 10MB limit', async () => {
      const largeFile = new File([new Uint8Array(10485761)], 'huge.jpg', { type: 'image/jpeg' });
      await expect(uploadPortfolioFile('designer-1/test.jpg', largeFile)).rejects.toThrow(
        /exceeds the 10MB limit/i
      );
    });

    it('throws when file has unwhitelisted MIME type', async () => {
      const gifFile = new File(['gif data'], 'anim.gif', { type: 'image/gif' });
      await expect(uploadPortfolioFile('designer-1/test.gif', gifFile)).rejects.toThrow(
        /unsupported MIME type/i
      );
    });

    it('uploads valid file with explicit contentType and returns public URL', async () => {
      const validFile = new File(['valid webp'], 'room.webp', { type: 'image/webp' });
      const mockStorage = supabase.storage.from('portfolio');
      mockStorage.upload.mockResolvedValueOnce({ data: { path: 'designer-1/room.webp' }, error: null });

      const url = await uploadPortfolioFile('designer-1/room.webp', validFile);

      expect(mockStorage.upload).toHaveBeenCalledWith(
        'designer-1/room.webp',
        validFile,
        expect.objectContaining({
          contentType: 'image/webp',
          upsert: false,
        })
      );
      expect(url).toBe('https://example.supabase.co/storage/v1/object/public/portfolio/test.webp');
    });
  });

  describe('Storage path slugification', () => {
    it('sanitizes categories with spaces and special characters', () => {
      const category = 'Living Room & Dining Area';
      const slugCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '_');
      expect(slugCategory).toBe('living_room___dining_area');
      expect(slugCategory).not.toContain(' ');
    });
  });
});

