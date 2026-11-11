import { afterEach, describe, expect, it, vi } from "vitest";
import { submitDesignerAccountRequest } from "../services/designerAccountRequestService";

afterEach(() => vi.unstubAllEnvs());

describe("designer request adapter", () => {
  it.each(["renewal", "featured"])("does not call the undeployed %s workflow", async (kind) => {
    vi.stubEnv("VITE_PHASE1A_DESIGNER_REQUEST_RPC_ENABLED", "false");
    const rpc = vi.fn();
    await expect(submitDesignerAccountRequest({ rpc }, kind)).rejects.toThrow(/workflow is deployed/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses the matching server workflow when enabled", async () => {
    vi.stubEnv("VITE_PHASE1A_DESIGNER_REQUEST_RPC_ENABLED", "true");
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    await expect(submitDesignerAccountRequest({ rpc }, "featured")).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("designer_request_featured");
  });
});
