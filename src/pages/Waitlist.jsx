import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Clock, Hourglass, LogOut } from "lucide-react";
import { signOut } from "../services/authService";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import {
  getDesignerAccountDestination,
  getDesignerAccountState,
} from "../utils/designerApproval";

const Waitlist = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [accountState, setAccountState] = useState("pending");
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    let isActive = true;
    const checkStatus = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user || !isActive) return;

        const [designerResult, applicationResult] = await Promise.all([
          supabase
            .from("designers")
            .select("id, user_id, is_verified, projects_completed, about_text")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("designer_applications")
            .select("status")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (designerResult.error) throw designerResult.error;
        if (applicationResult.error) throw applicationResult.error;
        if (!isActive) return;

        setRefreshFailed(false);
        const designer = designerResult.data;
        const application = applicationResult.data;
        const profile = { role: "designer", designer, application };
        const nextAccountState = getDesignerAccountState(user, profile);
        setAccountState(nextAccountState);
        queryClient.setQueryData(["users", user.id], (currentProfile) => ({
          ...(currentProfile || {}),
          role: currentProfile?.role || "designer",
          designer,
          application,
        }));

        if (["approved", "profile-review"].includes(nextAccountState)) {
          navigate(getDesignerAccountDestination(nextAccountState), { replace: true });
        }
      } catch (error) {
        console.error("Failed to refresh designer approval state:", error);
        if (isActive) setRefreshFailed(true);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [navigate, queryClient]);

  const handleLogout = async () => {
    try {
      await signOut();
      queryClient.clear();
      navigate("/login");
    } catch {
      // Fail silently
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-8 md:p-12 shadow-2xl text-center flex flex-col items-center space-y-6 animate-fade-in relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-accent/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Navigation Links */}
        <div className="w-full flex items-center justify-center gap-4 text-xs font-semibold border-b border-white/10 pb-4">
          <Link to="/aboutcontact#contact" className="text-gray-400 hover:text-white transition-colors">
            Contact Us
          </Link>
          <span className="text-gray-600">•</span>
          <Link to="/faqs" className="text-gray-400 hover:text-white transition-colors">
            FAQs
          </Link>
          <span className="text-gray-600">•</span>
          <Link to="/profile" className="text-gray-400 hover:text-white transition-colors">
            Profile Settings
          </Link>
        </div>

        {/* Icon Badge */}
        <div className="w-20 h-20 bg-brand-accent/20 border border-brand-accent/40 rounded-2xl flex items-center justify-center shadow-inner relative">
          <Clock className="w-10 h-10 text-brand-accent animate-pulse" />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-full border-2 border-slate-900">
            <Hourglass size={12} className="animate-spin" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white font-heading">
            {accountState === "review"
              ? "Application Status Needs Review"
              : "Application Under Review"}
          </h1>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            {refreshFailed
              ? "We could not refresh your account status. We will retry automatically."
              : accountState === "review"
              ? "Your application is not approved for dashboard access. Contact the team if you need help with its status."
              : "Our curation team is currently evaluating your design portfolio and credentials to ensure quality standards across our network."}
          </p>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-full text-xs font-bold text-amber-400 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          {accountState === "review"
            ? "Restricted"
            : "Pending Approval"}
        </div>

        {/* Secondary Sign Out Button */}
        <div className="pt-4 w-full border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 font-bold transition-all text-sm cursor-pointer active:scale-95 border border-white/10"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Waitlist;
