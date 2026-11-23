import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UserProfile from "../pages/UserProfile";

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            user: {
              id: "test-user-id",
              email: "designer@example.com",
              user_metadata: { full_name: "Test Designer", phone: "9876543210" },
              created_at: "2026-01-01T00:00:00Z",
            },
          },
        },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: {
              id: "test-user-id",
              full_name: "Test Designer",
              phone: "9876543210",
              city: "Hyderabad",
              location: "POINT(78.4867 17.3850)",
            },
          })),
        })),
      })),
    })),
  },
}));

describe("UserProfile Component", () => {
  it("mounts cleanly and renders without throwing reference or runtime errors", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <UserProfile />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("My Profile")).toBeInTheDocument();
    expect(screen.getByText("designer@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Designer")).toBeInTheDocument();
  });
});
