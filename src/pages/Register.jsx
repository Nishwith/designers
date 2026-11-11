import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { signUp } from "../services/authService";
import GoogleSignInButton from "../components/GoogleSignInButton";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const data = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
      });

      if (data?.user && !data?.session) {
        toast.success(
          "Success! Please check your email to verify your account before logging in.",
          { duration: 6000 }
        );
        navigate("/login");
      } else {
        toast.success("Account created successfully!");
        navigate("/onboarding");
      }
    } catch (error) {
      toast.error(error.message || "Registration failed.");
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
              Create Partner Account
            </h2>
            <p className="text-gray-500 font-sans font-light text-sm">
              Enter your details to start your designer onboarding
            </p>
          </div>

          <div className="space-y-3">
            <GoogleSignInButton label="Sign up with Google" />
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">or register with email</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-3">
              {/* Full Name */}
              <div className="group relative border-b border-gray-100 focus-within:border-brand-accent transition-all duration-500 py-1.5">
                <label className="text-xs font-bold text-gray-400 tracking-widest uppercase block mb-1">Full Name</label>
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-300 group-focus-within:text-brand-accent transition-colors duration-500 mr-3" />
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                    className="block w-full py-1.5 bg-transparent text-gray-900 placeholder-gray-300 text-base font-sans border-none outline-none focus:ring-0"
                    placeholder="John Doe" required />
                </div>
              </div>

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
                <label className="text-xs font-bold text-gray-400 tracking-widest uppercase block mb-1">Password</label>
                <div className="flex items-center">
                  <Lock className="h-5 w-5 text-gray-300 group-focus-within:text-brand-accent transition-colors duration-500 mr-3" />
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange}
                    className="block w-full py-1.5 bg-transparent text-gray-900 placeholder-gray-300 text-base font-sans border-none outline-none focus:ring-0"
                    placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-900 transition-colors ml-2 cursor-pointer">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button disabled={loading}
                className="group relative w-full py-3 bg-gray-900 hover:bg-brand-accent text-white font-bold rounded-2xl transition-all duration-500 flex items-center justify-center gap-3 cursor-pointer shadow-xl shadow-slate-900/5 hover:shadow-brand-accent/25 hover:-translate-y-0.5 disabled:opacity-75">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Create Account"}
              </button>
            </div>

            <div className="text-center text-xs sm:text-sm text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="text-brand-accent font-bold hover:underline transition-colors">
                Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
