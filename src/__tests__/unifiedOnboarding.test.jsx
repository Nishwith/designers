import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UnifiedOnboarding from "../pages/UnifiedOnboarding";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock("../supabaseClient", () => ({ supabase: supabaseMock }));

describe("UnifiedOnboarding eligibility", () => {
  beforeEach(() => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "new-designer", email: "designer@example.com" } },
    });
    supabaseMock.from.mockImplementation((table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => table === "users"
            ? { data: { role: "designer", phone: "" }, error: null }
            : { data: null, error: null },
        }),
      }),
    }));
  });

  it("allows a newly registered designer role with no application to submit onboarding", async () => {
    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<UnifiedOnboarding />} />
          <Route path="/" element={<div>Home route</div>} />
          <Route path="/waitlist" element={<div>Waitlist route</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Firm / Designer Name")).toBeInTheDocument();
    expect(screen.queryByText("Home route")).not.toBeInTheDocument();
  });
});
