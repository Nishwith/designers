import { describe, expect, it, vi } from "vitest";

const sharedClient = vi.hoisted(() => ({ auth: {}, from: vi.fn() }));
vi.mock("../supabaseClient", () => ({ supabase: sharedClient }));

import { supabase as serviceClient } from "../services/supabaseClient";

describe("Supabase client singleton", () => {
  it("reuses the root client for service imports", () => {
    expect(serviceClient).toBe(sharedClient);
  });
});
