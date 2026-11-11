import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isInquiryRpcEnabled,
  submitOrReopenInquiry,
  archiveInquiry,
} from "../services/designerInquiryService";

afterEach(() => vi.unstubAllEnvs());

describe("designerInquiryService in Designer App (Option B Inquiry Lifecycle & Concurrency)", () => {
  it("rejects invalid inputs without making database calls", async () => {
    const supabase = { rpc: vi.fn(), from: vi.fn() };

    await expect(submitOrReopenInquiry(null, {}))
      .rejects.toThrow("Supabase client is required.");

    await expect(submitOrReopenInquiry(supabase, { designerId: null, message: "Valid" }))
      .rejects.toThrow("A target designer ID is required.");

    await expect(submitOrReopenInquiry(supabase, { designerId: 15, message: "" }))
      .rejects.toThrow("Inquiry message cannot be empty.");

    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fails closed when feature flag is disabled, strictly prohibiting direct table mutations", async () => {
    vi.stubEnv("VITE_PHASE1A_INQUIRY_RPC_ENABLED", "false");
    expect(isInquiryRpcEnabled()).toBe(false);

    const supabase = { rpc: vi.fn(), from: vi.fn() };

    await expect(
      submitOrReopenInquiry(supabase, {
        designerId: 24,
        clientName: "Client",
        message: "Hello",
      })
    ).rejects.toThrow(
      "Inquiry submission is unavailable until the secure server inquiry operation is enabled (VITE_PHASE1A_INQUIRY_RPC_ENABLED=true)."
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("invokes submit_or_reopen_designer_inquiry RPC when feature flag is enabled", async () => {
    vi.stubEnv("VITE_PHASE1A_INQUIRY_RPC_ENABLED", "true");
    expect(isInquiryRpcEnabled()).toBe(true);

    const rpc = vi.fn().mockResolvedValue({
      data: {
        action: "created",
        connection_id: 101,
        status: "pending",
      },
      error: null,
    });

    const supabase = { rpc, from: vi.fn() };
    const result = await submitOrReopenInquiry(supabase, {
      designerId: 24,
      clientName: "Prospective Client",
      clientEmail: "prospect@example.com",
      clientPhone: "9876543210",
      message: "Initial inquiry",
    });

    expect(rpc).toHaveBeenCalledExactlyOnceWith("submit_or_reopen_designer_inquiry", {
      p_designer_id: 24,
      p_client_name: "Prospective Client",
      p_client_email: "prospect@example.com",
      p_client_phone: "9876543210",
      p_message: "Initial inquiry",
    });
    expect(result.action).toBe("created");
    expect(result.connection_id).toBe(101);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("propagates RPC errors directly without falling back to direct database writes", async () => {
    vi.stubEnv("VITE_PHASE1A_INQUIRY_RPC_ENABLED", "true");

    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "55000", message: "Designer profile is not currently accepting public inquiries" },
    });
    const supabase = { rpc, from: vi.fn() };

    await expect(
      submitOrReopenInquiry(supabase, {
        designerId: 24,
        message: "Hello",
      })
    ).rejects.toMatchObject({ code: "55000" });

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("handles simultaneous first-time submissions deterministically", async () => {
    vi.stubEnv("VITE_PHASE1A_INQUIRY_RPC_ENABLED", "true");

    let count = 0;
    const rpc = vi.fn().mockImplementation(() => {
      count += 1;
      return Promise.resolve({
        data: {
          action: count === 1 ? "created" : "reopened",
          connection_id: 202,
          status: "pending",
        },
        error: null,
      });
    });

    const supabase = { rpc, from: vi.fn() };

    const [sub1, sub2] = await Promise.all([
      submitOrReopenInquiry(supabase, { designerId: 24, message: "Concurrent sub 1" }),
      submitOrReopenInquiry(supabase, { designerId: 24, message: "Concurrent sub 2" }),
    ]);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(sub1.connection_id).toBe(202);
    expect(sub2.connection_id).toBe(202);
    expect([sub1.action, sub2.action].sort()).toEqual(["created", "reopened"]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("handles simultaneous reopening of an existing connection", async () => {
    vi.stubEnv("VITE_PHASE1A_INQUIRY_RPC_ENABLED", "true");

    const rpc = vi.fn().mockResolvedValue({
      data: {
        action: "reopened",
        connection_id: 202,
        status: "pending",
      },
      error: null,
    });

    const supabase = { rpc, from: vi.fn() };

    const [reopen1, reopen2] = await Promise.all([
      submitOrReopenInquiry(supabase, { designerId: 24, message: "Reopen attempt 1" }),
      submitOrReopenInquiry(supabase, { designerId: 24, message: "Reopen attempt 2" }),
    ]);

    expect(reopen1.action).toBe("reopened");
    expect(reopen2.action).toBe("reopened");
    expect(reopen1.connection_id).toBe(202);
    expect(reopen2.connection_id).toBe(202);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("archiveInquiry fails closed when feature flag is disabled", async () => {
    vi.stubEnv("VITE_PHASE1A_INQUIRY_RPC_ENABLED", "false");
    const supabase = { rpc: vi.fn(), from: vi.fn() };

    await expect(archiveInquiry(supabase, 55))
      .rejects.toThrow(/Inquiry archiving requires the secure server inquiry RPC/i);

    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("archiveInquiry invokes designer_archive_connection RPC when enabled", async () => {
    vi.stubEnv("VITE_PHASE1A_INQUIRY_RPC_ENABLED", "true");

    const rpc = vi.fn().mockResolvedValue({
      data: { action: "archived", connection_id: 55, status: "archived" },
      error: null,
    });
    const supabase = { rpc, from: vi.fn() };

    const result = await archiveInquiry(supabase, 55);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("designer_archive_connection", {
      p_connection_id: 55,
    });
    expect(result.status).toBe("archived");
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
