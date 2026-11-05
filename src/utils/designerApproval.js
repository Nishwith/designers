// Shared guard predicates live outside the React component module so Fast Refresh
// can safely treat AuthRoutes.jsx as a component-only module.
export const isProfessionalProfileComplete = (designer) => {
  const projectsCompleted = designer?.projects_completed;
  const hasValidProjectCount = projectsCompleted !== null &&
    projectsCompleted !== undefined &&
    String(projectsCompleted).trim() !== "" &&
    Number.isInteger(Number(projectsCompleted)) &&
    Number(projectsCompleted) >= 0;
  return hasValidProjectCount && Boolean(designer?.about_text?.trim());
};

export const isApproved = (profile) => {
  if (!profile?.designer || profile?.role !== "designer") return false;
  const application = profile?.application;
  // The verified no-application path is retained for admin-created VIP profiles.
  if (application) return application.status === "approved";

  // Keep the existing admin-created VIP path: an explicitly verified profile
  // without a collaboration application is treated as admin-authorized.
  return profile.designer.is_verified === true;
};

export const getDesignerAccountState = (user, profile) => {
  if (!user) return "unauthenticated";
  if (profile?.role === "admin" || profile?.role === "user") return "unauthorized";

  const application = profile?.application;
  const designer = profile?.designer;

  if (!application && !designer) return "onboarding";
  if (application?.status === "pending") return "pending";
  if (application && application.status !== "approved") return "review";

  const hasApprovedApplication = application?.status === "approved";
  const isVerifiedLegacyVip = !application && profile?.role === "designer" && designer?.is_verified === true;
  if (designer && (hasApprovedApplication || isVerifiedLegacyVip)) {
    if (!isProfessionalProfileComplete(designer)) return "profile-incomplete";
    if (designer.is_verified === true) return "approved";
    return "profile-review";
  }

  return "review";
};

export const getDesignerAccountDestination = (state) => {
  switch (state) {
    case "onboarding":
      return "/onboarding";
    case "profile-incomplete":
      return "/complete-profile";
    case "profile-review":
      return "/dashboard";
    case "pending":
    case "review":
      return "/waitlist";
    case "approved":
      return "/dashboard";
    case "unauthorized":
    case "unauthenticated":
    default:
      return "/login";
  }
};
