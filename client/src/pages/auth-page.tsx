// client/src/pages/auth-page.tsx
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { PasswordChangeDialog } from "@/components/password-change-dialog";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingLoginModal } from "@/components/landing/landing-login-modal";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingTestimonial } from "@/components/landing/landing-testimonial";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingFooterCta } from "@/components/landing/landing-footer-cta";

export default function AuthPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.mustChangePassword) {
        setLoginModalOpen(false);
        setShowPasswordChange(true);
      } else {
        if (user.role === "platform_owner") {
          navigate("/owners-dashboard");
        } else {
          navigate("/");
        }
      }
    }
  }, [user, navigate]);

  const handlePasswordChangeClose = () => {
    setShowPasswordChange(false);
    if (user && !user.mustChangePassword) {
      if (user.role === "platform_owner") {
        navigate("/owners-dashboard");
      } else {
        navigate("/");
      }
    }
  };

  return (
    <>
      <LandingNav onLoginClick={() => setLoginModalOpen(true)} />
      <LandingLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
      <main>
        <LandingHero onLoginClick={() => setLoginModalOpen(true)} />
        <hr className="border-gray-100 mx-6" />
        <LandingFeatures />
        <hr className="border-gray-100 mx-6" />
        <LandingTestimonial />
        <hr className="border-gray-100 mx-6" />
        <LandingPricing />
        <LandingFooterCta />
      </main>
      <PasswordChangeDialog
        isOpen={showPasswordChange}
        onClose={handlePasswordChangeClose}
        isForced={!!user?.mustChangePassword}
      />
    </>
  );
}
