import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import {
  Loader2,
  Building2,
  MapPin,
  Phone,
  Briefcase,
} from "lucide-react";
import toast from "react-hot-toast";

const UnifiedOnboarding = () => {
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [agreed, setAgreed] = useState(false);

  const [formData, setFormData] = useState({
    orgName: "",
    city: "Hyderabad",
    phone: "", 
    designerType: "interior",
  });
  const [customCity, setCustomCity] = useState("");

  useEffect(() => {
    isMounted.current = true;
    const checkEligibility = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted.current) navigate("/login");
          return;
        }
        if (isMounted.current) {
          setUser(user);
        }

        const { data: userRole } = await supabase
          .from("users")
          .select("role, phone")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted.current) {
          setFormData((prev) => ({
            ...prev,
            phone: userRole?.phone || user.user_metadata?.phone || user.phone || "",
          }));
        }

        if (userRole?.role === "admin" || userRole?.role === "designer") {
          toast.error("You are already a registered partner.");
          if (isMounted.current) navigate("/");
          return;
        }

        const { data: existingApp } = await supabase
          .from("designer_applications")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingApp) {
          toast.error(`You have already submitted an application.`);
          setTimeout(() => {
            window.location.href = "/waitlist";
          }, 1500);
          return;
        }
      } catch (error) {
        console.error("Check failed:", error);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };
    checkEligibility();
    return () => {
      isMounted.current = false;
    };
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agreed) {
      toast.error("You must agree to the Terms and Privacy Policy.");
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error("Please enter a valid 10-digit Indian phone number starting with 6-9.");
      return;
    }

    let finalCity = formData.city;
    if (formData.city === "Others") {
      const trimmedCustom = customCity.trim();
      if (!trimmedCustom) {
        toast.error("Please specify your city.");
        return;
      }
      finalCity = trimmedCustom;
    }

    setSubmitting(true);
    try {
      if (!formData.orgName)
        throw new Error("Please fill in the Organization Name.");

      const { error } = await supabase.from("designer_applications").insert({
        user_id: user.id,
        org_name: formData.orgName,
        city: finalCity,
        phone: formData.phone,
        email: user.email,
        designer_type: formData.designerType,
        status: "pending",
      });

      if (error) throw error;

      if (user?.id) {
        await supabase.from("users").update({
          phone: formData.phone,
          city: finalCity,
          full_name: formData.orgName,
          profile_completed: true,
        }).eq("id", user.id);
      }

      toast.success("Application Submitted! We will contact you soon.");
      window.location.href = "/waitlist";
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-accent" size={48} />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 pt-4 pb-12 px-4">

        <div className="text-center mb-6 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter font-sans leading-[1.1] md:whitespace-nowrap">
            COLLAB. <span className="text-brand-accent relative inline-block">
              EXPAND.
              <div className="absolute -bottom-3 left-0 w-full h-4 bg-brand-accent/20 -z-10 -rotate-2 skew-x-12"></div>
            </span>{" "}
            GROW.
          </h1>
          <p className="mt-6 text-lg text-gray-500 mx-auto ">
            Showcase your work to thousands of homeowners. Apply today to join India's fastest growing community of design professionals.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-2xl animate-fade-in max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              
              {/* Firm Name - Full Width */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Firm / Designer Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-4 text-gray-500" size={18} />
                  <input
                    type="text"
                    name="orgName"
                    value={formData.orgName}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Studio Zen"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 focus:border-brand-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-4 text-gray-500" size={18} />
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 focus:border-brand-accent focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              {/* Conditional City */}
              {formData.city === "Others" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Specify City
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-4 text-brand-accent" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="Type your city..."
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      className="w-full bg-gray-50 border border-brand-accent rounded-xl py-3 pl-10 pr-4 text-gray-900 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Business Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-4 text-gray-500" size={18} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="9876543210"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 focus:border-brand-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Specialization */}
              <div className={formData.city === "Others" ? "md:col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Specialization
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-4 text-gray-500" size={18} />
                  <select
                    name="designerType"
                    value={formData.designerType}
                    onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 focus:border-brand-accent focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="interior">Interior Design</option>
                    <option value="commercial">Commercial Design</option>
                    <option value="both">Both (Residential & Commercial)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="pt-2 flex items-start gap-3">
              <input
                id="agreed"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent cursor-pointer"
              />
              <label htmlFor="agreed" className="text-xs text-gray-500 leading-relaxed cursor-pointer select-none">
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="text-brand-accent underline hover:text-orange-600 font-medium">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" className="text-brand-accent underline hover:text-orange-600 font-medium">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-brand-accent hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed hover:-translate-y-0.5"
              >
                {submitting ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  "Submit Application"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

  );
};

export default UnifiedOnboarding;
