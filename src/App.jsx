import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { Toaster } from "react-hot-toast";

import React, { Suspense } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Connect from "./pages/Connect";
import ProfileRoute from "./pages/ProfileRoute";
import AboutContact from "./pages/AboutContact";
import Faqs from "./pages/Faqs";
import TermsOfServices from "./pages/TermsOfServices";
import Privacy from "./pages/Privacy";
import UpdatePassword from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";
import UnifiedOnboarding from "./pages/UnifiedOnboarding";
import Waitlist from "./pages/Waitlist";

import {
  RequireAuth,
  RequireGuest,
  GuestRoute,
  RequireDesigner,
  OnboardingGuard,
} from "./components/AuthRoutes";

const DesignerDashboard = React.lazy(() => import("./pages/DesignerDashboard"));
const DesignerProfileCompletion = React.lazy(() => import("./pages/DesignerProfileCompletion"));

const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-accent"></div>
  </div>
);

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#0f172a",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          },
          success: { iconTheme: { primary: "#ff7f00", secondary: "#fff" } },
        }}
      />
      <Navbar />
      <div className="pt-16 md:pt-20">
        <OnboardingGuard>
          <Routes>
            {/* Guest / Public Landing Routes */}
            <Route element={<GuestRoute />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/signup" element={<Navigate to="/register" replace />} />
            </Route>

            {/* Public Information */}
            <Route path="/aboutcontact" element={<AboutContact />} />
            <Route path="/faqs" element={<Faqs />} />
            <Route path="/faq" element={<Faqs />} />
            <Route path="/terms" element={<TermsOfServices />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            {/* Logged In Users */}
            <Route element={<RequireAuth />}>
              <Route path="/onboarding" element={<UnifiedOnboarding />} />
              <Route path="/collab" element={<Navigate to="/onboarding" replace />} />
              <Route
                path="/complete-profile"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <DesignerProfileCompletion />
                  </Suspense>
                }
              />
              <Route path="/waitlist" element={<Waitlist />} />
              <Route path="/connect" element={<Connect />} />
              <Route path="/profile" element={<ProfileRoute />} />
            </Route>



            {/* === DESIGNERS ONLY === */}
            <Route element={<RequireDesigner />}>
              <Route 
                path="/dashboard" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <DesignerDashboard />
                  </Suspense>
                } 
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </OnboardingGuard>
      </div>
      <Footer />
    </Router>
  );
}

export default App;

