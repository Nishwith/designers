import React from "react";
import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  ArrowRight,
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 pt-16 pb-8 relative overflow-hidden text-gray-900">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-1 bg-brand-accent/20 blur-[100px] pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-12">
          {/* 1. BRAND & SOCIALS (Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            <Link to="/" className="flex items-center gap-3 group w-fit">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-accent shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <span className="text-2xl font-black text-white">V</span>
              </div>
              <span className="text-3xl font-black tracking-tight text-gray-900 group-hover:text-brand-accent transition-colors">
                Vishwakarmans
              </span>
            </Link>
            <p className="text-gray-500 font-medium leading-relaxed max-w-md text-base">
              Connecting discerning homeowners with elite interior and exterior
              designers. Transform your space with verified professionals today.
            </p>
            <div className="flex gap-3 pt-2">
              {[Instagram, Facebook, Linkedin, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-brand-accent hover:text-white hover:border-brand-accent transition-all duration-300 shadow-sm"
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* 2. LINKS (Span 7 - Split into 3 columns) */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            {/* Column 1 */}
            <div className="space-y-5">
              <h4 className="text-gray-900 font-bold text-sm uppercase tracking-widest border-b border-gray-200 pb-3 w-fit">
                Clients
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/"
                    className="text-gray-500 hover:text-brand-accent font-medium text-sm transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-brand-accent"
                    />{" "}
                    Apply as Partner
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="text-gray-500 hover:text-brand-accent font-medium text-sm transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-brand-accent"
                    />{" "}
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-gray-500 hover:text-brand-accent font-medium text-sm transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-brand-accent"
                    />{" "}
                    Client Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2 */}
            <div className="space-y-5">
              <h4 className="text-gray-900 font-bold text-sm uppercase tracking-widest border-b border-gray-200 pb-3 w-fit">
                Professionals
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/collab"
                    className="text-gray-500 hover:text-brand-accent font-medium text-sm transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-brand-accent"
                    />{" "}
                    Join as Partner
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-gray-500 hover:text-brand-accent font-medium text-sm transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-brand-accent"
                    />{" "}
                    Partner Login
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard"
                    className="text-gray-500 hover:text-brand-accent font-medium text-sm transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-brand-accent"
                    />{" "}
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3 */}
            <div className="space-y-5">
              <h4 className="text-gray-900 font-bold text-sm uppercase tracking-widest border-b border-gray-200 pb-3 w-fit">
                Company
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/aboutcontact#about"
                    className="text-gray-500 hover:text-brand-accent font-medium text-sm transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-brand-accent"
                    />{" "}
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/aboutcontact#contact"
                    className="text-gray-500 hover:text-brand-accent font-medium text-sm transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-brand-accent"
                    />{" "}
                    Contact Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 font-medium">
          <p>
            © {new Date().getFullYear()} Vishwakarmans. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              to="/terms"
              className="hover:text-brand-accent transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="hover:text-brand-accent transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
