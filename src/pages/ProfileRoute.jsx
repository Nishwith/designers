import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCurrentUser, useUserProfile } from "../hooks/useAuth";
import { getDesignerAccountState } from "../utils/designerApproval";
import UserProfile from "./UserProfile";

const ProfileRoute = () => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useUserProfile(user?.id);
  const [refreshedUserId, setRefreshedUserId] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (user?.id) {
      refetchProfile().finally(() => {
        if (mounted) setRefreshedUserId(user.id);
      });
    }
    return () => { mounted = false; };
  }, [user?.id, refetchProfile]);

  if (userLoading || (user && (profileLoading || refreshedUserId !== user.id))) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-accent" size={40} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (profileError) {
    return <div role="alert" className="p-6 text-center">Unable to refresh your designer profile. Please reload and try again.</div>;
  }
  if (profile?.role === "admin") {
    return <Navigate to="/login" replace />;
  }

  // Allow standard users (role === 'user' without an approved designer profile) to access their profile form
  if (profile?.role === "user") {
    return <UserProfile />;
  }

  const accountState = getDesignerAccountState(user, profile);
  if (accountState === "onboarding") return <Navigate to="/onboarding" replace />;
  if (accountState === "profile-incomplete") return <Navigate to="/complete-profile" replace />;
  if (accountState === "profile-review") return <Navigate to="/dashboard" replace />;
  if (accountState === "approved") return <Navigate to="/dashboard" replace />;

  return <UserProfile />;
};

export default ProfileRoute;
