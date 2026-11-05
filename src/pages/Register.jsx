import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { signUp } from "../services/authService";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { supabase } from "../supabaseClient";

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
      await signUp(formData.email, formData.password, {
        fullName: formData.fullName,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("users").upsert({
          id: user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: "designer",
        });
      }

      toast.success("Account created successfully!");
      navigate("/onboarding");
    } catch (error) {
      toast.error(error.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-full flex flex-col md:flex-row bg-white overflow-hidden animate-fade-in">
      {/* Left Branding */}
      <div className="hidden md:flex md:w-1/2 h-full bg-slate-950 relative items-center justify-center p-16">
        <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/20 to-slate-950/90"></div>
        <div className="relative z-10 max-w-md text-white space-y-8">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
            <User className="text-brand-accent w-7 h-7" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight leading-tight font-heading">
              Join <span className="text-brand-accent">Vishwakarmans</span>
            </h1>
            <p className="text-gray-400 text-lg font-sans leading-relaxed font-light">
              Create your professional partner account to showcase your design portfolio and connect with verified client inquiries.
            </p>
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className="w-full md:w-1/2 h-full overflow-y-auto flex flex-col px-6 md:px-12 xl:px-20 bg-white scrollbar-hide py-2">
        <div className="m-auto w-full max-w-md space-y-6 animate-slide-up">
          <div className="flex justify-center md:justify-start mb-2">
            <img src="/logo.png" alt="Vishwakarmans Logo" className="h-8 md:h-10 w-auto object-contain" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight font-heading">
              Create Partner Account
            </h2>
            <p className="text-gray-500 font-sans font-light text-base">
              Enter your details to start your designer onboarding
            </p>
          </div>

          <div className="space-y-4">
            <GoogleSignInButton label="Sign up with Google" />
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">or register with email</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="group relative border-b border-gray-100 focus-within:border-brand-accent transition-all duration-500 py-1.5">
              <label className="text-xs font-bold text-gray-400 tracking-widest uppercase block mb-1">Full Name</label>
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-300 group-focus-within:text-brand-accent transition-colors duration-500 mr-3" />
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                  className="block w-full py-2.5 min-h-[44px] bg-transparent text-gray-900 placeholder-gray-300 text-base font-sans border-none outline-none focus:ring-0"
                  placeholder="John Doe" required />
              </div>
            </div>

            {/* Email */}
            <div className="group relative border-b border-gray-100 focus-within:border-brand-accent transition-all duration-500 py-1.5">
              <label className="text-xs font-bold text-gray-400 tracking-widest uppercase block mb-1">Email Address</label>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-300 group-focus-within:text-brand-accent transition-colors duration-500 mr-3" />
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="block w-full py-2.5 min-h-[44px] bg-transparent text-gray-900 placeholder-gray-300 text-base font-sans border-none outline-none focus:ring-0"
                  placeholder="name@example.com" required />
              </div>
            </div>

            {/* Password */}
            <div className="group relative border-b border-gray-100 focus-within:border-brand-accent transition-all duration-500 py-1.5">
              <label className="text-xs font-bold text-gray-400 tracking-widest uppercase block mb-1">Password</label>
              <div className="flex items-center">
                <Lock className="h-5 w-5 text-gray-300 group-focus-within:text-brand-accent transition-colors duration-500 mr-3" />
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange}
                  className="block w-full py-2.5 min-h-[44px] bg-transparent text-gray-900 placeholder-gray-300 text-base font-sans border-none outline-none focus:ring-0"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-900 transition-colors ml-2 cursor-pointer">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button disabled={loading}
                className="group relative w-full min-h-[48px] h-12 bg-gray-900 hover:bg-brand-accent text-white font-bold rounded-2xl transition-all duration-500 flex items-center justify-center gap-3 cursor-pointer shadow-xl shadow-slate-900/5 hover:shadow-brand-accent/25 hover:-translate-y-0.5 disabled:opacity-75">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Create Account"}
              </button>
            </div>

            <div className="text-center text-sm text-gray-500">
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
