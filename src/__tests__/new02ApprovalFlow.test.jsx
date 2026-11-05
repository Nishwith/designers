import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

const account = vi.hoisted(() => ({
  user: { id: "flow-designer", email: "flow@example.com" },
  designer: null,
  application: null,
  profile: null,
  refetch: vi.fn(),
}));
const supabaseMock = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}));
const toastMock = vi.hoisted(() => Object.assign(vi.fn(), {
  error: vi.fn(),
  success: vi.fn(),
  loading: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useCurrentUser: () => ({ data: account.user, isLoading: false }),
  useUserProfile: () => ({
    data: account.profile,
    isLoading: false,
    isError: false,
    refetch: account.refetch,
  }),
}));
vi.mock("../supabaseClient", () => ({ supabase: supabaseMock }));
vi.mock("react-hot-toast", () => ({ default: toastMock, Toaster: () => null }));
vi.mock("../pages/DesignerDashboard", () => ({
  default: ({ profileOnly }) => (
    <div>{profileOnly ? "Full professional profile form" : "Operational designer dashboard"}</div>
  ),
}));
vi.mock("../services/authService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    signOut: vi.fn(),
    getUserProfile: vi.fn(async () => account.profile),
  };
});

const syncProfile = () => {
  account.profile = {
    role: "designer",
    designer: account.designer ? { ...account.designer } : null,
    application: account.application ? { ...account.application } : null,
  };
};

const renderApp = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

describe("NEW-02 approval and dashboard flow", () => {
  beforeEach(() => {
    account.user = { id: "flow-designer", email: "flow@example.com" };
    account.application = { id: "app-1", status: "approved" };
    account.designer = {
      id: 42,
      user_id: account.user.id,
      name: "Studio One",
      city: "Hyderabad",
      is_verified: false,
      projects_completed: null,
      about_text: "",
    };
    syncProfile();
    account.refetch.mockImplementation(async () => ({ data: account.profile }));
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: account.user }, error: null });
    supabaseMock.from.mockImplementation((table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: table === "designers" ? account.designer : account.application,
            error: null,
          }),
        }),
      }),
      update: (payload) => ({
        eq: (_column, userId) => ({
          select: () => ({
            maybeSingle: async () => {
              if (table !== "designers" || userId !== account.user.id) {
                return { data: null, error: new Error("wrong owner") };
              }
              account.designer = { ...account.designer, ...payload };
              syncProfile();
              return { data: account.designer, error: null };
            },
          }),
        }),
      }),
    }));
    window.history.replaceState({}, "", "/waitlist");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("routes an approved application with an incomplete profile to the full profile form", async () => {
    renderApp();
    expect(await screen.findByText("Full professional profile form")).toBeInTheDocument();
    expect(screen.queryByText("Operational designer dashboard")).not.toBeInTheDocument();
  });

  it("keeps an approved designer on the dashboard while professional review is pending", async () => {
    account.designer = {
      ...account.designer,
      is_verified: false,
      projects_completed: 1,
      about_text: "Studio profile",
    };
    syncProfile();
    renderApp();
    expect(await screen.findByText("Operational designer dashboard")).toBeInTheDocument();
  });

  it("routes the supplied approved and verified application 21/designer 29 state directly to dashboard", async () => {
    account.user = { id: "72b57fa4-46e4-47ac-9b4f-e25a28b778e3", email: "designer@example.com" };
    account.application = {
      id: 21,
      user_id: account.user.id,
      status: "approved",
    };
    account.designer = {
      id: 29,
      user_id: account.user.id,
      is_verified: true,
      projects_completed: 1,
      about_text: "hj",
      name: "Existing studio",
    };
    syncProfile();
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: account.user }, error: null });

    renderApp();

    expect(await screen.findByText("Operational designer dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Complete Profile")).not.toBeInTheDocument();
    expect(account.application).toMatchObject({ id: 21, status: "approved" });
    expect(account.designer).toMatchObject({ id: 29, is_verified: true, projects_completed: 1, about_text: "hj" });
  });
});
