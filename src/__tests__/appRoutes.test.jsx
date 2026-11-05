import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

const authState = vi.hoisted(() => ({
  user: { id: "pending-designer" },
  profile: { role: "designer", designer: null, application: { status: "pending" } },
}));

vi.mock("../hooks/useAuth", () => ({
  useCurrentUser: () => ({ data: authState.user, isLoading: false }),
  useUserProfile: () => ({ data: authState.profile, isLoading: false }),
}));

vi.mock("../services/authService", () => ({ signOut: vi.fn() }));

vi.mock("../pages/AboutContact", () => ({ default: () => <div>Contact page route</div> }));
vi.mock("../pages/Faqs", () => ({ default: () => <div>FAQ page route</div> }));
vi.mock("../pages/Waitlist", () => ({ default: () => <div>Waitlist page route</div> }));
vi.mock("../pages/ProfileRoute", () => ({ default: () => <div>Profile page route</div> }));
vi.mock("../pages/UnifiedOnboarding", () => ({ default: () => <div>Onboarding page route</div> }));
vi.mock("../pages/Login", () => ({ default: () => <div>Login page route</div> }));
vi.mock("../pages/Register", () => ({ default: () => <div>Register page route</div> }));
vi.mock("../pages/Connect", () => ({ default: () => <div>Connect page route</div> }));
vi.mock("../pages/TermsOfServices", () => ({ default: () => <div>Terms page route</div> }));
vi.mock("../pages/Privacy", () => ({ default: () => <div>Privacy page route</div> }));
vi.mock("../pages/UpdatePassword", () => ({ default: () => <div>Password update route</div> }));
vi.mock("../pages/NotFound", () => ({ default: () => <div>Not found route</div> }));
vi.mock("../pages/DesignerDashboard", () => ({ default: () => <div>Private dashboard route</div> }));

const renderApp = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

describe("application support and state routes", () => {
  beforeEach(() => {
    authState.user = { id: "pending-designer" };
    authState.profile = { role: "designer", designer: null, application: { status: "pending" } };
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it.each(["/aboutcontact", "/faqs", "/faq"])("opens public route %s directly while pending", async (path) => {
    window.history.replaceState({}, "", path);
    renderApp();
    const expectedText = path === "/aboutcontact" ? "Contact page route" : "FAQ page route";
    expect(await screen.findByText(expectedText)).toBeInTheDocument();
  });

  it("keeps support links usable and browser back returns to the waitlist", async () => {
    window.history.replaceState({}, "", "/waitlist");
    renderApp();
    expect(await screen.findByText("Waitlist page route")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("link", { name: "Contact Us" })[0]);
    expect(await screen.findByText("Contact page route")).toBeInTheDocument();
    await act(async () => window.history.back());
    expect(await screen.findByText("Waitlist page route")).toBeInTheDocument();
  });

  it("opens Contact Us and FAQs from the mobile navigation menu", async () => {
    window.history.replaceState({}, "", "/waitlist");
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const contactLinks = screen.getAllByRole("link", { name: "Contact Us" });
    const faqLinks = screen.getAllByRole("link", { name: "FAQs" });
    expect(contactLinks).toHaveLength(2);
    expect(faqLinks).toHaveLength(2);
    expect(contactLinks[1]).toHaveAttribute("href", "/aboutcontact#contact");
    expect(faqLinks[1]).toHaveAttribute("href", "/faqs");
    fireEvent.click(contactLinks[1]);
    expect(await screen.findByText("Contact page route")).toBeInTheDocument();
  });

  it("uses the state destination for a direct dashboard URL", async () => {
    window.history.replaceState({}, "", "/dashboard");
    renderApp();
    expect(await screen.findByText("Waitlist page route")).toBeInTheDocument();
    expect(screen.queryByText("Private dashboard route")).not.toBeInTheDocument();
  });
});
