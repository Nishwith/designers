import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-full flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Left side: Premium dark panel */}
      <div className="hidden md:flex md:w-1/2 h-full bg-slate-950 relative items-center justify-center p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/10 to-slate-950/95"></div>
        <div className="relative z-10 text-center space-y-6">
          <h1 className="text-[12rem] font-black text-white/5 leading-none tracking-tighter select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl font-black text-brand-accent tracking-tighter">
              4<span className="text-white">0</span>4
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Content */}
      <div className="w-full md:w-1/2 h-full overflow-y-auto flex items-center justify-center p-8 md:p-20 lg:p-28 bg-white scrollbar-hide">
        <div className="w-full max-w-lg space-y-8 animate-slide-up">
          <div className="md:hidden text-center mb-4">
            <span className="text-7xl font-black text-gray-900 tracking-tighter">
              4<span className="text-brand-accent">0</span>4
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight font-heading">
              Page not found
            </h2>
            <p className="text-gray-500 font-sans font-light text-lg leading-relaxed">
              The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              to="/"
              className="group relative inline-flex items-center justify-center gap-3 py-4 px-8 bg-gray-900 hover:bg-brand-accent text-white font-bold rounded-2xl transition-all duration-500 shadow-xl hover:shadow-brand-accent/25 hover:-translate-y-0.5"
            >
              <Home size={20} /> Take me home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-3 py-4 px-8 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl transition-all border border-gray-200"
            >
              <ArrowLeft size={20} /> Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
