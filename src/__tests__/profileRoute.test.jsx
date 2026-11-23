import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileRoute from "../pages/ProfileRoute";

const authState = vi.hoisted(() => ({ user: null, profile: null, refetch: vi.fn() }));

vi.mock("../hooks/useAuth", () => ({
  useCurrentUser: () => ({ data: authState.user, isLoading: false }),
  useUserProfile: () => ({
    data: authState.profile,
    isLoading: false,
    isError: false,
    refetch: authState.refetch,
  }),
}));

vi.mock("../pages/UserProfile", () => ({
  default: () => <div>User profile settings</div>,
}));

const renderProfileRoute = () => render(
  <MemoryRouter initialEntries={["/profile"]}>
    <Routes>
      <Route path="/profile" element={<ProfileRoute />} />
      <Route path="/onboarding" element={<div>Collaboration application</div>} />
      <Route path="/login" element={<div>Login page</div>} />
      <Route path="/complete-profile" element={<div>Full professional profile form</div>} />
      <Route path="/waitlist" element={<div>Professional profile review</div>} />
      <Route path="/dashboard" element={<div>Operational designer dashboard</div>} />
    </Routes>
  </MemoryRouter>
);

describe("ProfileRoute", () => {
  beforeEach(() => {
    authState.user = { id: "designer-user-1" };
    authState.profile = null;
    authState.refetch.mockImplementation(async () => ({ data: authState.profile }));
  });

  it("routes an approved designer with an incomplete profile to the full-page form", async () => {
    authState.profile = {
      role: "designer",
      designer: { id: 42, name: "Studio One", is_verified: false, projects_completed: null, about_text: "" },
      application: { id: 21, status: "approved" },
    };
    renderProfileRoute();
    expect(await screen.findByText("Full professional profile form")).toBeInTheDocument();
  });

  it("allows a completed but unverified designer to open their profile settings without premature redirection", async () => {
    authState.profile = {
      role: "designer",
      designer: { id: 42, is_verified: false, projects_completed: 1, about_text: "Studio" },
      application: { id: 21, status: "approved" },
    };
    renderProfileRoute();
    expect(await screen.findByText("User profile settings")).toBeInTheDocument();
    expect(screen.queryByText("Operational designer dashboard")).not.toBeInTheDocument();
  });

  it("keeps pending applicants on their account settings page", async () => {
    authState.profile = {
      role: "designer",
      designer: null,
      application: { status: "pending" },
    };
    renderProfileRoute();
    expect(await screen.findByText("User profile settings")).toBeInTheDocument();
  });

  it("allows standard users without designer profile to render profile route", async () => {
    authState.profile = {
      role: "user",
      designer: null,
      application: null,
    };
    renderProfileRoute();
    expect(await screen.findByText("User profile settings")).toBeInTheDocument();
  });

  it("sends a new signup without records to collaboration onboarding", async () => {
    authState.profile = { role: "designer", designer: null, application: null };
    renderProfileRoute();
    expect(await screen.findByText("Collaboration application")).toBeInTheDocument();
  });

  it("renders UserProfile for an authenticated approved designer session without prematurely redirecting or throwing", async () => {
    authState.user = { id: "72b57fa4-46e4-47ac-9b4f-e25a28b778e3" };
    authState.profile = {
      role: "designer",
      designer: {
        id: 29,
        user_id: "72b57fa4-46e4-47ac-9b4f-e25a28b778e3",
        is_verified: true,
        projects_completed: 1,
        about_text: "hj",
      },
      application: { id: 21, user_id: "72b57fa4-46e4-47ac-9b4f-e25a28b778e3", status: "approved" },
    };

    renderProfileRoute();

    expect(await screen.findByText("User profile settings")).toBeInTheDocument();
    expect(screen.queryByText("Collaboration application")).not.toBeInTheDocument();
    expect(screen.queryByText("Operational designer dashboard")).not.toBeInTheDocument();
  });
});
