import { describe, expect, it } from "vitest";
import {
  getDesignerAccountState,
  isApproved,
} from "../utils/designerApproval";

describe("isApproved", () => {
  it("does not treat a designer row alone as approval", () => {
    expect(isApproved({ designer: { id: 1 } })).toBe(false);
  });

  it("requires explicit verification only for the legacy no-application VIP path", () => {
    expect(isApproved({ role: "designer", designer: { is_verified: false } })).toBe(false);
    expect(isApproved({ role: "designer", designer: { is_verified: "true" } })).toBe(false);
  });

  it("allows an explicitly verified designer without a pending application", () => {
    expect(isApproved({ role: "designer", designer: { is_verified: true } })).toBe(true);
  });

  it("does not let a stale verified flag override a non-approved application", () => {
    expect(isApproved({
      role: "designer",
      designer: { is_verified: true },
      application: { status: "pending" },
    })).toBe(false);
  });

  it("does not treat a missing application status as approval", () => {
    expect(isApproved({ role: "designer", designer: { is_verified: true }, application: {} })).toBe(false);
    expect(getDesignerAccountState({ id: "designer-1" }, {
      role: "designer",
      designer: { is_verified: true, projects_completed: 4, about_text: "Studio" },
      application: {},
    })).toBe("review");
  });

  it("allows an approved application before professional profile verification", () => {
    expect(isApproved({
      role: "designer",
      designer: { is_verified: false },
      application: { status: "approved" },
    })).toBe(true);
  });

  it("does not grant access to a non-designer user", () => {
    expect(isApproved({
      role: "user",
      designer: { is_verified: true },
      application: { status: "approved" },
    })).toBe(false);
  });
});

describe("getDesignerAccountState", () => {
  const user = { id: "designer-user-1" };

  it("identifies an authenticated signup with no application or designer row", () => {
    expect(getDesignerAccountState(user, { role: "designer" })).toBe("onboarding");
  });

  it("routes an approved designer with an incomplete professional profile to full-page completion", () => {
    expect(getDesignerAccountState(user, {
      role: "designer",
      designer: { id: 42, is_verified: false, projects_completed: null, about_text: "" },
      application: { status: "approved" },
    })).toBe("profile-incomplete");
  });

  it("prioritizes pending application review over an existing profile row", () => {
    expect(getDesignerAccountState(user, {
      role: "designer",
      designer: { is_verified: true, projects_completed: 4, about_text: "Studio" },
      application: { status: "pending" },
    })).toBe("pending");
  });

  it("routes a completed profile awaiting professional review to the review screen", () => {
    expect(getDesignerAccountState(user, {
      role: "designer",
      designer: { is_verified: false, projects_completed: 4, about_text: "Studio" },
      application: { status: "approved" },
    })).toBe("profile-review");
  });

  it("keeps dashboard authorization after submission while the profile review remains pending", () => {
    const profile = {
      role: "designer",
      designer: { is_verified: false, projects_completed: 1, about_text: "Studio" },
      application: { status: "approved" },
    };
    expect(getDesignerAccountState(user, profile)).toBe("profile-review");
    expect(isApproved(profile)).toBe(true);
  });

  it("routes a verified VIP with an incomplete profile to the profile-only form", () => {
    expect(getDesignerAccountState(user, {
      role: "designer",
      designer: { is_verified: true, projects_completed: null, about_text: "" },
      application: null,
    })).toBe("profile-incomplete");
  });

  it("does not treat an unverified profile without an application as an approved VIP", () => {
    expect(getDesignerAccountState(user, {
      role: "designer",
      designer: { is_verified: false, projects_completed: 4, about_text: "Studio" },
      application: null,
    })).toBe("review");
  });

  it("requires application approval for full access", () => {
    expect(getDesignerAccountState(user, {
      role: "designer",
      designer: { is_verified: true, projects_completed: 4, about_text: "Studio" },
      application: { status: "approved" },
    })).toBe("approved");
  });

  it("routes a completed and verified designer to the dashboard", () => {
    expect(getDesignerAccountState(user, {
      role: "designer",
      designer: { is_verified: true, projects_completed: 4, about_text: "Studio" },
      application: { status: "approved" },
    })).toBe("approved");
  });

  it("does not infer a rejected/resubmission workflow from an unknown status", () => {
    expect(getDesignerAccountState(user, {
      role: "designer",
      designer: { is_verified: true, projects_completed: 4, about_text: "Studio" },
      application: { status: "rejected" },
    })).toBe("review");
  });
});
