import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  User,
  Mail,
  Phone,
  Save,
  Loader2,
  LogOut,
  Shield,
  Calendar,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "../services/authService";

const CITY_OPTIONS = [
  "Hyderabad",
  "Bangalore",
  "Mumbai",
  "Delhi",
  "Kolkata",
  "Chennai",
  "Other",
];

const UserProfile = () => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    city: "",
    customCity: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);

      // Load existing metadata from public users table if you have one, or just auth metadata
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        const existingCity = profile.city || "";
        const isStandard = CITY_OPTIONS.includes(existingCity);
        setFormData({
          fullName:
            profile.full_name || session.user.user_metadata.full_name || "",
          phone: profile.phone || session.user.user_metadata.phone || "",
          city: isStandard ? existingCity : (existingCity ? "Other" : ""),
          customCity: !isStandard ? existingCity : "",
        });
      }
      setLoading(false);
    };
    fetchUser();
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    // ponytail: reuse same Indian phone regex from complete-profile (BUG-006)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    const finalCity = formData.city === "Other" ? formData.customCity.trim() : formData.city;
    if (!finalCity || finalCity.trim() === "" || finalCity === "Select City" || finalCity === "Select a City") {
      toast.error("Please select a valid city.");
      return;
    }

    setSaving(true);
    try {
      // 1. Update Auth Metadata (so session stays fresh)
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: formData.fullName, phone: formData.phone },
      });
      if (authError) throw authError;

      // 2. Update Public Users Table
      await supabase
        .from("users")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          city: finalCity,
        })
        .eq("id", user.id);

      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Profile Updated!");
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      queryClient.clear();
      navigate("/login");
    } catch {
      // fallback
    }
  };

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 pt-4 px-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="text-brand-accent" /> My Profile
          </h1>
          <button
            onClick={handleLogout}
            className="text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl">
          {/* Header / Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-8 border-b border-gray-100 text-center sm:text-left">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-accent to-orange-600 flex items-center justify-center text-4xl font-bold text-gray-900 shadow-lg border-4 border-brand-dark">
              {formData.fullName
                ? formData.fullName[0].toUpperCase()
                : user.email[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {formData.fullName || "User"}
              </h2>

              {/* Role & Date Badges */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase flex items-center gap-1.5">
                  <Shield size={12} /> Client Account
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 text-gray-500 border border-gray-200 text-xs font-bold flex items-center gap-1.5">
                  <Calendar size={12} /> Joined {formatDate(user.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleUpdate} className="space-y-6">
            {/* Email (Read Only) */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                Email Address
              </label>
              <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-200 p-3.5 rounded-xl text-gray-500 cursor-not-allowed transition-colors hover:border-gray-300">
                <Mail size={18} />
                <span className="font-mono text-sm">{user.email}</span>
                <LockIcon size={14} className="ml-auto opacity-50" />
              </div>
              <p className="text-[10px] text-gray-600 mt-1.5 ml-1">
                Email cannot be changed.
              </p>
            </div>

            {/* Name Input */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                Full Name
              </label>
              <div className="relative group">
                <User
                  size={18}
                  className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-brand-accent transition-colors"
                />
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-gray-900 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all placeholder-gray-600"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                Phone Number
              </label>
              <div className="relative group">
                <Phone
                  size={18}
                  className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-brand-accent transition-colors"
                />
                <input
                  type="tel"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-gray-900 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all placeholder-gray-600"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="e.g. 98765 43210"
                />
              </div>
            </div>

            {/* City Dropdown */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                City
              </label>
              <div className="relative group">
                <select
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all appearance-none cursor-pointer"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                >
                  <option value="">Select City</option>
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom City Field */}
            {formData.city === "Other" && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                  Custom City Name
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all placeholder-gray-600"
                  value={formData.customCity}
                  onChange={(e) =>
                    setFormData({ ...formData, customCity: e.target.value })
                  }
                  placeholder="Enter custom city"
                />
              </div>
            )}

            {/* Change Password Button */}
            <div className="pt-4 border-t border-gray-100 mt-6 mb-4">
              <Link className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm" to="/update-password">
                Change Password
              </Link>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                disabled={saving}
                className="w-full bg-brand-accent hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Save size={20} />
                )}
                {saving ? "Saving Changes..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const LockIcon = ({ size, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

export default UserProfile;
