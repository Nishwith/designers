import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ErrorBoundary from "../components/ErrorBoundary";

const ProblemChild = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Test explosion!");
  }
  return <div>Everything is fine</div>;
};

describe("ErrorBoundary Component (Designers Portal)", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Everything is fine")).toBeInTheDocument();
  });

  it("catches errors and displays the branded fallback card with Reload Page button", () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Oops! Something went wrong.")).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred while rendering this page/i)
    ).toBeInTheDocument();
    const reloadButton = screen.getByRole("button", { name: /reload page/i });
    expect(reloadButton).toBeInTheDocument();
  });

  it("invokes window.location.reload when the button is clicked", () => {
    const originalReload = window.location.reload;
    const reloadMock = vi.fn();
    delete window.location;
    window.location = { reload: reloadMock };

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole("button", { name: /reload page/i });
    fireEvent.click(reloadButton);

    expect(reloadMock).toHaveBeenCalledTimes(1);

    window.location = { reload: originalReload };
  });
});
