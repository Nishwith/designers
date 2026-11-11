import { afterEach, describe, expect, it, vi } from "vitest";
import { signUp, updateUserProfile } from "../services/authService";
import { updateOwnDesignerProfile, hideOwnDesignerProfile } from "../services/designerProfileService";
import { checkServerAdminAuthorization } from "../services/phase1aAuthorizationService";
import { getDesignerAccountState } from "../utils/designerApproval";

vi.mock("../services/supabaseClient", () => ({
  supabase: {
    auth: { signUp: vi.fn(), getUser: vi.fn() },
    from: vi.fn(),
  },
}));

import { supabase } from "../services/supabaseClient";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("Phase 1A app contracts", () => {
  it("creates the Auth identity without writing a designer role to public.users", async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    await signUp("designer@example.com", "secret", { fullName: "Designer Name", role: "admin", phone: "9876543210" });

    expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: { phone: "9876543210", full_name: "Designer Name" },
      }),
    }));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("keeps pending applications and approved designers on their existing state paths", () => {
    const user = { id: "u-1" };
    expect(getDesignerAccountState(user, {
      role: "client", application: { status: "pending" }, designer: null,
    })).toBe("pending");
    expect(getDesignerAccountState(user, {
      role: "designer", application: { status: "approved" },
      designer: { projects_completed: 1, about_text: "Profile", is_verified: false },
    })).toBe("profile-review");
    expect(getDesignerAccountState(user, {
      role: "designer", application: { status: "approved" },
      designer: { projects_completed: 1, about_text: "Profile", is_verified: true },
    })).toBe("approved");
  });

  it("uses the allowlist RPC only when enabled and does not hardcode administrator IDs", async () => {
    vi.stubEnv("VITE_PHASE1A_ADMIN_AUTH_RPC_ENABLED", "true");
    const firstAdminRpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const secondAdminRpc = vi.fn().mockResolvedValue({ data: true, error: null });
    await expect(checkServerAdminAuthorization({ rpc: firstAdminRpc })).resolves.toEqual({ enabled: true, authorized: true });
    await expect(checkServerAdminAuthorization({ rpc: secondAdminRpc })).resolves.toEqual({ enabled: true, authorized: true });
    expect(firstAdminRpc).toHaveBeenCalledExactlyOnceWith("is_admin");
    expect(secondAdminRpc).toHaveBeenCalledExactlyOnceWith("is_admin");
    expect(JSON.stringify([firstAdminRpc.mock.calls, secondAdminRpc.mock.calls])).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });

  it("limits public.users updates to the authenticated user's approved fields", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    supabase.from.mockReturnValue({ update });
    await updateUserProfile("u-1", { phone: "9876543210", city: "Pune", profile_completed: true });
    expect(update).toHaveBeenCalledWith({ phone: "9876543210", city: "Pune", profile_completed: true });
    await expect(updateUserProfile("u-1", { role: "designer" })).rejects.toThrow(/protected fields/i);
  });

  it("limits designer updates to owner profile fields and authenticated ownership", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 4 }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ select }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    supabase.from.mockReturnValue({ update });

    await updateOwnDesignerProfile(supabase, "u-1", 4, { name: "Studio", city: "Pune", video_link: "https://youtu.be/abc" });
    expect(update).toHaveBeenCalledWith({ name: "Studio", city: "Pune", video_link: "https://youtu.be/abc" });
    expect(eqId).toHaveBeenCalledWith("id", 4);
    expect(eqUser).toHaveBeenCalledWith("user_id", "u-1");
  });

  it.each(["user_id", "is_verified", "is_public", "featured_status", "subscription_end", "priority_score"])(
    "rejects privileged designer field %s", async (field) => {
      await expect(updateOwnDesignerProfile(supabase, "u-1", 4, { [field]: "forbidden" })).rejects.toThrow(/protected fields/i);
      expect(supabase.from).not.toHaveBeenCalled();
    },
  );

  it("does not let designers reactivate profiles and keeps self-hide gated until deployment", async () => {
    const rpc = vi.fn();
    vi.stubEnv("VITE_PHASE1A_SELF_HIDE_RPC_ENABLED", "false");
    await expect(hideOwnDesignerProfile({ rpc }, 4)).rejects.toThrow(/workflow is deployed/i);
    expect(rpc).not.toHaveBeenCalled();

    vi.stubEnv("VITE_PHASE1A_SELF_HIDE_RPC_ENABLED", "true");
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(hideOwnDesignerProfile({ rpc }, 4)).resolves.toEqual({ id: 4, is_public: false });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("designer_hide_own_profile");
  });
});
