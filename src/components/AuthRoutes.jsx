import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser, useUserProfile } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

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

// Helper function to check if a route is whitelisted (excludes it from onboarding & waitlist redirects)
const isWhitelisted = (pathname) => {
  const whitelist = [
    "/onboarding",
    "/login",
    "/update-password",
    "/waitlist",
    "/contact",
    "/faq",
    "/faqs",
    "/aboutcontact",
    "/help",
    "/terms",
    "/privacy",
    "/settings",
    "/profile",
  ];
  return whitelist.some((path) => pathname.includes(path));
};

// Helper function to check if designer profile is approved
export const isApproved = (profile) => {
  if (!profile) return false;
  if (!profile.designer) return false;
  if (
    profile?.application?.status === "pending" ||
    profile?.status === "pending" ||
    profile?.designer?.status === "pending" ||
    profile?.is_approved === false
  ) {
    return false;
  }
  if (profile.designer || profile.status === "approved" || profile.is_approved === true) {
    return true;
  }
  return false;
};

// Helper function to check if designer profile is fully completed
export const isDesignerProfileComplete = (profile) => !!profile?.application || !!profile?.designer;

// Custom hook to reject non-designer users immediately
const useBouncer = (user, profile) => {
  const isUnauthorized = Boolean(
    user && profile && (profile.role === "admin" || profile.role === "user")
  );

  useEffect(() => {
    if (isUnauthorized) {
      const performSignOut = async () => {
        if (typeof supabase?.auth?.signOut === "function") {
          try { await supabase.auth.signOut(); } catch {}
        }
        toast.error("Unauthorized: This portal is strictly for verified Designers");
      };
      performSignOut();
    }
  }, [isUnauthorized]);

  return isUnauthorized;
};

// 1. REQUIRE AUTH (Any logged in user)
export const RequireAuth = () => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const location = useLocation();
  const isUnauthorizedRole = useBouncer(user, profile);

  if (userLoading || (user && profileLoading)) {
    return <LoadingScreen />;
  }

  // Step 1: Auth check
  if (!user || isUnauthorizedRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Step 2: Onboarding check
  const hasCompletedProfile = isDesignerProfileComplete(profile);
  if (!hasCompletedProfile) {
    if (location.pathname !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }
    return <Outlet />;
  }

  // Step 3: Approval check
  const approved = isApproved(profile);
  if (!approved) {
    if (location.pathname !== "/waitlist") {
      return <Navigate to="/waitlist" replace />;
    }
    return <Outlet />;
  }

  return <Outlet />;
};

// 2. GUEST ROUTE (For unauthenticated public landing pages like Login / Onboarding)
export const GuestRoute = ({ children }) => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const location = useLocation();
  const isUnauthorizedRole = useBouncer(user, profile);

  if (userLoading || (user && profileLoading)) {
    return <LoadingScreen />;
  }

  // Unauthenticated guests -> allow access to guest route
  if (!user || isUnauthorizedRole) {
    return children ? children : <Outlet />;
  }

  // Step 2: Onboarding check for logged in user
  const hasCompletedProfile = isDesignerProfileComplete(profile);
  if (!hasCompletedProfile) {
    if (location.pathname === "/onboarding") {
      return children ? children : <Outlet />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  // Step 3: Approval check for completed profile
  const approved = isApproved(profile);
  if (!approved) {
    if (location.pathname === "/waitlist") {
      return children ? children : <Outlet />;
    }
    return <Navigate to="/waitlist" replace />;
  }

  // Authenticated & Approved -> go to dashboard
  return <Navigate to="/dashboard" replace />;
};

export const RequireGuest = GuestRoute;

// 3. REQUIRE DESIGNER (Checks Database Role & Approval)
export const RequireDesigner = () => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const location = useLocation();
  const isUnauthorizedRole = useBouncer(user, profile);

  if (userLoading || profileLoading) {
    return <LoadingScreen />;
  }

  // Step 1: Auth check
  if (!user || isUnauthorizedRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Step 2: Onboarding check
  const hasCompletedProfile = isDesignerProfileComplete(profile);
  if (!hasCompletedProfile) {
    return <Navigate to="/onboarding" replace />;
  }

  // Step 3: Approval check
  const approved = isApproved(profile);
  if (!approved) {
    return <Navigate to="/waitlist" replace />;
  }

  return <Outlet />;
};

// 4. GLOBAL PROFILE COMPLETION GUARD
export const OnboardingGuard = ({ children }) => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const location = useLocation();
  const isUnauthorizedRole = useBouncer(user, profile);

  if (userLoading || (user && profileLoading)) {
    return <LoadingScreen />;
  }

  if (isUnauthorizedRole) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return children;
  }

  // Step 2: Onboarding check
  const hasCompletedProfile = isDesignerProfileComplete(profile);
  if (!hasCompletedProfile && !isWhitelisted(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }

  // Step 3: Approval check
  const approved = isApproved(profile);
  if (hasCompletedProfile && !approved && !isWhitelisted(location.pathname)) {
    return <Navigate to="/waitlist" replace />;
  }

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
