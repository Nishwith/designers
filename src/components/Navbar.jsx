import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, ShieldAlert, Loader2 } from "lucide-react";
import { useCurrentUser, useUserProfile } from "../hooks/useAuth";
import { signOut } from "../services/authService";
import { useQueryClient } from "@tanstack/react-query";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Consume decoupled global query state
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await signOut(queryClient, navigate, "/login");
    } catch (error) {
      console.warn("Server signout failed, forcing local cleanup", error);
      if (queryClient) {
        queryClient.setQueryData(['auth', 'user'], null);
        queryClient.setQueryData(['auth', 'session'], null);
        queryClient.clear();
      }
      localStorage.clear();
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  const role = profile?.role || "client";
  const loading = userLoading || (user && profileLoading);
  const isDesigner = Boolean(profile?.designer || role === "designer");

  const actionLink =
    role === "admin"
      ? { text: "Admin Panel", path: "/admin", icon: <ShieldAlert size={18} /> }
      : isDesigner
      ? { text: "Go to Dashboard", path: "/dashboard", icon: null }
      : { text: "Are you a designer? Join us", path: "/onboarding", icon: null };

  return (
    <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-200 fixed w-full z-50 top-0 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="Vishwakarmans Logo" className="h-8 md:h-10 w-auto object-contain" />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/aboutcontact#contact"
              className="text-gray-600 hover:text-brand-accent font-semibold transition-colors"
            >
              Contact Us
            </Link>
            <Link
              to="/faqs"
              className="text-gray-600 hover:text-brand-accent font-semibold transition-colors"
            >
              FAQs
            </Link>
            <Link
              to={actionLink.path}
              className="flex items-center gap-2 font-semibold text-brand-accent transition-colors"
            >
              {actionLink.icon} {actionLink.text}
            </Link>
            
            {loading ? (
              <div className="flex items-center justify-center pl-6">
                <Loader2 className="animate-spin text-gray-300 w-5 h-5" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-gray-700 hover:text-brand-accent transition-all font-semibold"
                >
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                    <User size={18} className="text-gray-600" />
                  </div>
                  <span>
                    {user.user_metadata?.full_name?.split(" ")[0] || "Profile"}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 font-semibold text-sm cursor-pointer transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100"
                  title="Logout"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-brand-accent font-bold px-4 py-2 rounded-xl border border-gray-200 hover:border-brand-accent/40 transition-all active:scale-95"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="bg-brand-accent text-white px-5 py-2 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
              className="text-gray-900 p-2 focus:outline-none"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 p-4 space-y-4 animate-fade-in shadow-xl">
          <Link
            to="/aboutcontact#contact"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-gray-900 font-semibold hover:bg-gray-50 hover:text-brand-accent rounded-xl"
          >
            Contact Us
          </Link>
          <Link
            to="/faqs"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-gray-900 font-semibold hover:bg-gray-50 hover:text-brand-accent rounded-xl"
          >
            FAQs
          </Link>
          <Link
            to={actionLink.path}
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-brand-accent font-bold hover:bg-gray-50 rounded-xl"
          >
            {actionLink.text}
          </Link>
          <div className="border-t border-gray-200 pt-4 mt-2">
            {loading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="animate-spin text-gray-300 w-5 h-5" />
              </div>
            ) : user ? (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-gray-900 font-semibold hover:bg-gray-50 hover:text-brand-accent rounded-xl"
                >
                  User Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-500 w-full text-left font-bold px-4 py-3 flex items-center gap-3 hover:bg-red-50 rounded-xl transition-colors min-h-[44px]"
                >
                  <LogOut size={18} /> Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block text-center text-gray-700 hover:text-brand-accent font-bold px-4 py-2.5 border border-gray-200 rounded-xl transition-all"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="block text-center bg-brand-accent text-white font-bold px-4 py-2.5 rounded-xl hover:bg-orange-600 transition-all shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
