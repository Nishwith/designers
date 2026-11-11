import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { signInWithPassword, sendPasswordResetEmail } from "../services/authService";
import { supabase } from "../supabaseClient";
import GoogleSignInButton from "../components/GoogleSignInButton";

const Login = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- LOGIN LOGIC ---
  // ponytail: navigate("/") and let OnboardingGuard handle role redirect — kills the FOUC race
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithPassword(formData.email, formData.password);
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // --- FORGOT PASSWORD LOGIC ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const inputEmail = formData.email?.trim();
    if (!inputEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('designers')
        .select('email')
        .eq('email', inputEmail)
        .maybeSingle();

      if (!data) {
        toast.error("No account found with this email.");
        return;
      }

      await sendPasswordResetEmail(inputEmail);
      toast.success("Email link sent");
      setIsResetMode(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 -mt-16 md:-mt-20 pt-16 md:pt-20">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
        {/* White form card with inner scroll fallback */}
        <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-3 sm:space-y-4 max-h-full overflow-y-auto animate-slide-up">
          <div className="flex justify-center mb-2">
            <img src="/logo.png" alt="Vishwakarmans Logo" className="h-10 sm:h-12 w-auto object-contain" />
          </div>
          <div className="space-y-1 text-center mb-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight font-heading">
              {isResetMode ? "Reset Password" : "Sign In"}
            </h2>
            <p className="text-gray-500 font-sans font-light text-sm">
              {isResetMode ? "Enter your email to receive a reset link" : "Access your personalized workspace"}
            </p>
          </div>

          {/* Google Sign In */}
          {!isResetMode && (
            <div className="space-y-3">
              <GoogleSignInButton label="Sign in with Google" />
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">or continue with email</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>
            </div>
          )}

          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-4">
              <div className="group relative border-b border-gray-100 focus-within:border-brand-accent transition-all duration-500 py-1.5">
                <label className="text-xs font-bold text-gray-400 tracking-widest uppercase block mb-1">Email Address</label>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-300 group-focus-within:text-brand-accent transition-colors duration-500 mr-3" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className="block w-full py-1.5 bg-transparent text-gray-900 placeholder-gray-300 text-base font-sans border-none outline-none focus:ring-0"
                    placeholder="name@example.com" required />
                </div>
              </div>
              <div className="pt-2">
                <button disabled={loading}
                  className="group relative w-full py-3 bg-gray-900 hover:bg-brand-accent text-white font-bold rounded-2xl transition-all duration-500 flex items-center justify-center gap-3 cursor-pointer shadow-xl shadow-slate-900/5 hover:shadow-brand-accent/25 hover:-translate-y-0.5 disabled:opacity-75">
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Send Reset Link"}
                </button>
              </div>
              <button type="button" onClick={() => setIsResetMode(false)}
                className="w-full text-gray-500 hover:text-gray-900 text-sm flex items-center justify-center gap-2">
                <ArrowLeft size={14} /> Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
              <div className="space-y-3">
                {/* Email */}
                <div className="group relative border-b border-gray-100 focus-within:border-brand-accent transition-all duration-500 py-1.5">
                  <label className="text-xs font-bold text-gray-400 tracking-widest uppercase block mb-1">Email Address</label>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-300 group-focus-within:text-brand-accent transition-colors duration-500 mr-3" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange}
                      className="block w-full py-1.5 bg-transparent text-gray-900 placeholder-gray-300 text-base font-sans border-none outline-none focus:ring-0"
                      placeholder="name@example.com" required />
                  </div>
                </div>

                {/* Password */}
                <div className="group relative border-b border-gray-100 focus-within:border-brand-accent transition-all duration-500 py-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">Password</label>
                    <button type="button" onClick={() => setIsResetMode(true)}
                      className="text-xs text-brand-accent hover:text-orange-400 font-bold">Forgot Password?</button>
                  </div>
                  <div className="flex items-center">
                    <Lock className="h-5 w-5 text-gray-300 group-focus-within:text-brand-accent transition-colors duration-500 mr-3" />
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange}
                      className="block w-full py-1.5 bg-transparent text-gray-900 placeholder-gray-300 text-base font-sans border-none outline-none focus:ring-0"
                      placeholder="••••••••" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-900 transition-colors ml-2">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button disabled={loading}
                  className="group relative w-full py-3 bg-gray-900 hover:bg-brand-accent text-white font-bold rounded-2xl transition-all duration-500 flex items-center justify-center gap-3 cursor-pointer shadow-xl shadow-slate-900/5 hover:shadow-brand-accent/25 hover:-translate-y-0.5 disabled:opacity-75">
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign In"}
                </button>
              </div>

              <div className="text-center text-xs sm:text-sm text-gray-500">
                Don't have an account?{" "}
                <Link to="/register" className="text-gray-900 hover:text-brand-accent font-bold transition-colors">Sign Up</Link>
              </div>

              {/* Designer Callout */}
              <div className="bg-brand-accent/5 border border-brand-accent/10 rounded-xl p-2.5 text-center">
                <p className="text-xs text-gray-600">
                  Are you an interior designer or architect?{" "}
                  <Link to="/register" className="text-brand-accent font-bold hover:underline">Join Marketplace</Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

