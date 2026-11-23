import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCurrentLocation,
  fetchIpLocation,
  reverseGeocode,
  DEFAULT_COORDINATES,
} from "../utils/geolocation";

describe("Cross-Browser Geolocation Utility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns GPS coordinates on normal success (enableHighAccuracy: false)", async () => {
    let capturedOptions;
    const mockGetCurrentPosition = vi.fn((success, _error, options) => {
      capturedOptions = options;
      success({
        coords: {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 15,
        },
      });
    });

    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: mockGetCurrentPosition,
      },
    });

    const result = await getCurrentLocation();

    expect(mockGetCurrentPosition).toHaveBeenCalled();
    expect(capturedOptions?.enableHighAccuracy).toBe(false);
    expect(capturedOptions?.timeout).toBe(8000);
    expect(result.latitude).toBe(12.9716);
    expect(result.longitude).toBe(77.5946);
    expect(result.approximate).toBe(false);
    expect(result.isFallback).toBe(false);
    expect(result.source).toBe("gps");
  });

  it("falls back to IP geolocation on TIMEOUT (code 3) without hanging", async () => {
    const mockGetCurrentPosition = vi.fn((_success, error) => {
      error({
        code: 3, // TIMEOUT
        message: "Location request timed out",
      });
    });

    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: mockGetCurrentPosition,
      },
    });

    // Mock fetch for IP location lookup
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          latitude: "19.0760",
          longitude: "72.8777",
          city: "Mumbai",
        }),
      })
    );

    const result = await getCurrentLocation();

    expect(mockGetCurrentPosition).toHaveBeenCalled();
    expect(result.latitude).toBe(19.076);
    expect(result.longitude).toBe(72.8777);
    expect(result.city).toBe("Mumbai");
    expect(result.approximate).toBe(true);
    expect(result.isFallback).toBe(true);
    expect(result.source).toBe("ip");
  });

  it("falls back to IP geolocation on POSITION_UNAVAILABLE (code 2) (macOS Safari / Brave)", async () => {
    const mockGetCurrentPosition = vi.fn((_success, error) => {
      error({
        code: 2, // POSITION_UNAVAILABLE
        message: "Position unavailable",
      });
    });

    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: mockGetCurrentPosition,
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          latitude: "28.6139",
          longitude: "77.2090",
          city: "New Delhi",
        }),
      })
    );

    const result = await getCurrentLocation();

    expect(mockGetCurrentPosition).toHaveBeenCalled();
    expect(result.latitude).toBe(28.6139);
    expect(result.longitude).toBe(77.209);
    expect(result.city).toBe("New Delhi");
    expect(result.approximate).toBe(true);
    expect(result.isFallback).toBe(true);
  });

  it("rejects immediately with actionable error on PERMISSION_DENIED (code 1) without hanging", async () => {
    const mockGetCurrentPosition = vi.fn((_success, error) => {
      error({
        code: 1, // PERMISSION_DENIED
        message: "User denied Geolocation",
      });
    });

    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: mockGetCurrentPosition,
      },
    });

    await expect(getCurrentLocation()).rejects.toMatchObject({
      code: 1,
      isDenied: true,
      message: expect.stringMatching(/permission denied/i),
    });
  });

  it("fetchIpLocation returns fallback default coordinates when all IP lookups fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));

    const result = await fetchIpLocation(100);

    expect(result.latitude).toBe(DEFAULT_COORDINATES.latitude);
    expect(result.longitude).toBe(DEFAULT_COORDINATES.longitude);
    expect(result.isFallback).toBe(true);
  });

  it("reverseGeocode returns null safely without throwing on network timeout or error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Nominatim error")));

    const result = await reverseGeocode(17.385, 78.4867, 100);
    expect(result).toBeNull();
  });

  it("reverseGeocode parses city correctly on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          display_name: "Hyderabad, Telangana, India",
          address: {
            city: "Hyderabad",
            state: "Telangana",
            country: "India",
          },
        }),
      })
    );

    const result = await reverseGeocode(17.385, 78.4867);
    expect(result).not.toBeNull();
    expect(result.city).toBe("Hyderabad");
    expect(result.displayName).toContain("Hyderabad");
  });
});
