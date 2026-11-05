import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Waitlist from "../pages/Waitlist";

vi.mock("../services/authService", () => ({ signOut: vi.fn() }));
vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  },
}));

describe("waitlist support navigation", () => {
  it("links to the existing Contact, FAQ and Profile routes", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/waitlist"]}>
          <Routes>
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/aboutcontact" element={<div>Contact page</div>} />
            <Route path="/faqs" element={<div>FAQ page</div>} />
            <Route path="/profile" element={<div>Profile page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute(
      "href",
      "/aboutcontact#contact"
    );
    expect(screen.getByRole("link", { name: "FAQs" })).toHaveAttribute("href", "/faqs");
    expect(screen.getByRole("link", { name: "Profile Settings" })).toHaveAttribute(
      "href",
      "/profile"
    );
  });
});
