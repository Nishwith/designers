import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser, useUserProfile } from "../hooks/useAuth";
import { Loader2 } from "lucide-react";
import {
  getDesignerAccountDestination,
  getDesignerAccountState,
  isApproved,
} from "../utils/designerApproval";

// Full-screen branded loading spinner to prevent session flicker (FOUC)
const LoadingScreen = () => (
  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
    <div className="relative flex flex-col items-center space-y-4">
      <Loader2 className="animate-spin text-brand-accent w-12 h-12 stroke-[2.5]" />
      <span className="text-sm font-semibold text-gray-500 tracking-wider font-heading uppercase animate-pulse">
        Securing Session...
      </span>
    </div>
  </div>
);

const SUPPORT_PATHS = new Set([
  "/aboutcontact",
  "/faqs",
  "/faq",
  "/terms",
  "/privacy",
  "/update-password",
]);

const isSupportPath = (pathname) => SUPPORT_PATHS.has(pathname);

// 1. REQUIRE AUTH (Any logged in user)
export const RequireAuth = () => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const location = useLocation();

  if (userLoading || (user && profileLoading)) {
    return <LoadingScreen />;
  }

  // Step 1: Auth check
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const state = getDesignerAccountState(user, profile);
  const destination = getDesignerAccountDestination(state);

  if (location.pathname === "/profile") {
    if (state === "onboarding") {
      if (profile?.role === "user") return <Outlet />;
      return <Navigate to={destination} replace />;
    }
    return <Outlet />;
  }
  if (location.pathname === "/complete-profile") {
    if (state === "profile-incomplete") return <Outlet />;
    return <Navigate to={destination} replace />;
  }
  if (location.pathname === "/onboarding" && state === "onboarding") return <Outlet />;
  if (
    location.pathname === "/waitlist" &&
    ["pending", "review"].includes(state)
  ) {
    return <Outlet />;
  }
  if (!["approved", "profile-review"].includes(state) || !isApproved(profile)) {
    return <Navigate to={destination} replace />;
  }
  if (["/onboarding", "/waitlist"].includes(location.pathname)) {
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
};

// 2. GUEST ROUTE (For unauthenticated public landing pages like Login / Onboarding)
export const GuestRoute = ({ children }) => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);

  if (user === null) {
    return children ? children : <Outlet />;
  }

  if (userLoading || (user && profileLoading)) {
    return <LoadingScreen />;
  }

  // Unauthenticated guests -> allow access to guest route
  if (!user) {
    return children ? children : <Outlet />;
  }

  const state = getDesignerAccountState(user, profile);
  return <Navigate to={getDesignerAccountDestination(state)} replace />;
};

export const RequireGuest = GuestRoute;

// 3. REQUIRE DESIGNER (Checks Database Role & Approval)
export const RequireDesigner = () => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const location = useLocation();

  if (user === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (userLoading || profileLoading) {
    return <LoadingScreen />;
  }

  // Step 1: Auth check
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const state = getDesignerAccountState(user, profile);
  if (!["approved", "profile-review"].includes(state) || !isApproved(profile)) {
    return <Navigate to={getDesignerAccountDestination(state)} replace />;
  }

  return <Outlet />;
};

// 4. GLOBAL PROFILE COMPLETION GUARD
export const OnboardingGuard = ({ children }) => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const location = useLocation();

  if (user === null) {
    return children;
  }

  if (userLoading || (user && profileLoading)) {
    return <LoadingScreen />;
  }

  if (!user) {
    return children;
  }

  if (isSupportPath(location.pathname)) return children;

  const state = getDesignerAccountState(user, profile);
  const destination = getDesignerAccountDestination(state);
  const path = location.pathname;

  if (path === "/profile") {
    if (state === "onboarding") {
      if (profile?.role === "user") return children;
      return <Navigate to="/onboarding" replace />;
    }
    return children;
  }

  if (
    path === "/complete-profile" &&
    state === "profile-incomplete"
  ) {
    return children;
  }
  if (path === "/onboarding" && state === "onboarding") return children;
  if (path === "/waitlist" && ["pending", "review"].includes(state)) {
    return children;
  }

  if (path !== destination) return <Navigate to={destination} replace />;

  return children;
};

// 5. APPROVAL GATE (Whitelists support routes & restricts unapproved users to waitlist)
export const ApprovalGate = ({ children }) => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const location = useLocation();

  const allowedPaths = ['/contact', '/faq', '/faqs', '/aboutcontact', '/help', '/terms', '/privacy', '/settings', '/profile', '/waitlist'];
  if (allowedPaths.some(path => location.pathname.includes(path))) {
    return children ? children : <Outlet />;
  }

  if (userLoading || (user && profileLoading)) {
    return <LoadingScreen />;
  }

  const approved = isApproved(profile);
  if (!approved) {
    return <Navigate to="/waitlist" replace />;
  }

  return children ? children : <Outlet />;
};
