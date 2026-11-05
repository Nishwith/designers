import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingGuard, RequireDesigner } from "../components/AuthRoutes";

const authState = vi.hoisted(() => ({ user: null, profile: null }));

vi.mock("../hooks/useAuth", () => ({
  useCurrentUser: () => ({ data: authState.user, isLoading: false }),
  useUserProfile: () => ({ data: authState.profile, isLoading: false }),
}));

vi.mock("../supabaseClient", () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

const AccountRoutes = ({ initialEntry }) => (
  <MemoryRouter initialEntries={[initialEntry]}>
    <OnboardingGuard>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/onboarding" element={<div>Collaboration application</div>} />
        <Route path="/profile" element={<div>Profile completion</div>} />
        <Route path="/complete-profile" element={<div>Full professional profile completion</div>} />
        <Route path="/waitlist" element={<div>Application waiting</div>} />
        <Route element={<RequireDesigner />}>
          <Route path="/dashboard" element={<div>Private designer dashboard</div>} />
        </Route>
        <Route path="/aboutcontact" element={<div>Contact page</div>} />
        <Route path="/faqs" element={<div>FAQs page</div>} />
        <Route path="/faq" element={<div>FAQs page</div>} />
      </Routes>
    </OnboardingGuard>
  </MemoryRouter>
);

const signedIn = (profile) => {
  authState.user = { id: "designer-user-1" };
  authState.profile = profile;
};

describe("designer account access routes", () => {
  beforeEach(() => {
    authState.user = null;
    authState.profile = null;
  });

  it("sends a signed-up designer with no application or designer row to onboarding", async () => {
    signedIn({ role: "designer", designer: null, application: null });
    render(<AccountRoutes initialEntry="/dashboard" />);
    expect(await screen.findByText("Collaboration application")).toBeInTheDocument();
    expect(screen.queryByText("Private designer dashboard")).not.toBeInTheDocument();
  });

  it("routes a direct profile URL for a new signup back to onboarding", async () => {
    signedIn({ role: "designer", designer: null, application: null });
    render(<AccountRoutes initialEntry="/profile" />);
    expect(await screen.findByText("Collaboration application")).toBeInTheDocument();
  });

  it("routes an approved designer with an incomplete profile to the original full form", async () => {
    signedIn({
      role: "designer",
      designer: { id: 42, is_verified: false, projects_completed: null, about_text: "" },
      application: { status: "approved" },
    });
    render(<AccountRoutes initialEntry="/dashboard" />);
    expect(await screen.findByText("Full professional profile completion")).toBeInTheDocument();
  });

  it("keeps a non-approved profile restricted even when its designer row is incomplete", async () => {
    signedIn({
      role: "designer",
      designer: { id: 42, is_verified: false, projects_completed: null, about_text: "" },
      application: { status: "pending" },
    });
    render(<AccountRoutes initialEntry="/dashboard" />);
    expect(await screen.findByText("Application waiting")).toBeInTheDocument();
    expect(screen.queryByText("Profile completion")).not.toBeInTheDocument();
    expect(screen.queryByText("Private designer dashboard")).not.toBeInTheDocument();
  });

  it("does not admit an unverified designer without an application", async () => {
    signedIn({
      role: "designer",
      designer: { id: 42, is_verified: false, projects_completed: 5, about_text: "Studio" },
      application: null,
    });
    render(<AccountRoutes initialEntry="/dashboard" />);
    expect(await screen.findByText("Application waiting")).toBeInTheDocument();
    expect(screen.queryByText("Private designer dashboard")).not.toBeInTheDocument();
  });

  it("keeps a pending application on the waitlist even if a designer row exists", async () => {
    signedIn({
      role: "designer",
      designer: { id: 42, is_verified: true, projects_completed: 4, about_text: "Studio" },
      application: { status: "pending" },
    });
    render(<AccountRoutes initialEntry="/dashboard" />);
    expect(await screen.findByText("Application waiting")).toBeInTheDocument();
    expect(screen.queryByText("Private designer dashboard")).not.toBeInTheDocument();
  });

  it("routes direct onboarding access for a pending applicant to the waitlist", async () => {
    signedIn({ role: "designer", designer: null, application: { status: "pending" } });
    render(<AccountRoutes initialEntry="/onboarding" />);
    expect(await screen.findByText("Application waiting")).toBeInTheDocument();
  });

  it("keeps the dashboard accessible while a completed professional profile is under review", async () => {
    signedIn({
      role: "designer",
      designer: { id: 42, is_verified: false, projects_completed: 4, about_text: "Studio" },
      application: { status: "approved" },
    });
    render(<AccountRoutes initialEntry="/dashboard" />);
    expect(await screen.findByText("Private designer dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Application waiting")).not.toBeInTheDocument();
  });

  it("allows a complete, approved and verified designer into the dashboard", async () => {
    signedIn({
      role: "designer",
      designer: { id: 42, is_verified: true, projects_completed: 4, about_text: "Studio" },
      application: { status: "approved" },
    });
    render(<AccountRoutes initialEntry="/dashboard" />);
    expect(await screen.findByText("Private designer dashboard")).toBeInTheDocument();
  });

  it("allows an approved, verified but unpaid designer into the dashboard", async () => {
    signedIn({
      role: "designer",
      designer: {
        id: 42,
        is_verified: true,
        projects_completed: 4,
        about_text: "Studio",
        is_subscription_active: false,
        subscription_end: null,
      },
      application: { status: "approved" },
    });
    render(<AccountRoutes initialEntry="/dashboard" />);
    expect(await screen.findByText("Private designer dashboard")).toBeInTheDocument();
  });

  it("routes direct waitlist access for a fully approved designer to the dashboard", async () => {
    signedIn({
      role: "designer",
      designer: { is_verified: true, projects_completed: 4, about_text: "Studio" },
      application: { status: "approved" },
    });
    render(<AccountRoutes initialEntry="/waitlist" />);
    expect(await screen.findByText("Private designer dashboard")).toBeInTheDocument();
  });

  it("routes unknown application statuses to the existing restricted waitlist", async () => {
    signedIn({
      role: "designer",
      designer: { id: 42, is_verified: true, projects_completed: 4, about_text: "Studio" },
      application: { status: "rejected" },
    });
    render(<AccountRoutes initialEntry="/dashboard" />);
    expect(await screen.findByText("Application waiting")).toBeInTheDocument();
    expect(screen.queryByText("Private designer dashboard")).not.toBeInTheDocument();
  });

  it("does not make public support pages depend on approval", async () => {
    signedIn({ role: "designer", designer: null, application: { status: "pending" } });
    const { unmount } = render(<AccountRoutes initialEntry="/aboutcontact" />);
    expect(await screen.findByText("Contact page")).toBeInTheDocument();
    unmount();
    render(<AccountRoutes initialEntry="/faqs" />);
    expect(await screen.findByText("FAQs page")).toBeInTheDocument();
  });

  it("routes an unauthenticated user away from the private dashboard to login", async () => {
    render(<AccountRoutes initialEntry="/dashboard" />);
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
