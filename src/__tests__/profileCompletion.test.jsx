import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DesignerProfileCompletion from "../pages/DesignerProfileCompletion";

vi.mock("../pages/DesignerDashboard", () => ({
  default: ({ profileOnly }) => (
    <div>{profileOnly ? "Shared full profile editor" : "Dashboard workspace"}</div>
  ),
}));

describe("DesignerProfileCompletion route wrapper", () => {
  it("reuses the dashboard's original full profile editor instead of a second form", () => {
    render(<DesignerProfileCompletion />);
    expect(screen.getByText("Shared full profile editor")).toBeInTheDocument();
  });
});
