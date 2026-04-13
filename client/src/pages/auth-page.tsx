import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import RouteSeo from "@/components/seo/route-seo";
import { PasswordChangeDialog } from "@/components/password-change-dialog";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingLoginModal } from "@/components/landing/landing-login-modal";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingProblem } from "@/components/landing/landing-problem";
import { LandingStatement } from "@/components/landing/landing-statement";
import { LandingTeachMode } from "@/components/landing/landing-teach-mode";
import { LandingBlocks } from "@/components/landing/landing-blocks";
import { LandingAudience } from "@/components/landing/landing-audience";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingSocialProof } from "@/components/landing/landing-social-proof";
import { LandingTestimonial } from "@/components/landing/landing-testimonial";
import { LandingFaq } from "@/components/landing/landing-faq";
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
      <RouteSeo
        title="MusicDott — Software voor Muziekscholen & Muziekleraren"
        description="Beheer je muziekschool in één platform. Roosters, lessen, leerlingen, facturering en Teach Mode. Gratis proberen — geen creditcard nodig."
        canonical="https://musicdott.app/"
        robots="index, follow"
        alternates={[
          { hreflang: "nl", href: "https://musicdott.app/" },
          { hreflang: "en", href: "https://musicdott.app/" },
          { hreflang: "x-default", href: "https://musicdott.app/" },
        ]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "MusicDott",
          "url": "https://musicdott.app",
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "Web Browser",
          "description": "Compleet platform voor muziekscholen en muziekleraren: roosters, lessen, leerlingbeheer, facturering en real-time les geven.",
          "inLanguage": ["nl", "en"],
          "offers": {
            "@type": "Offer",
            "price": "29.95",
            "priceCurrency": "EUR",
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": "29.95",
              "priceCurrency": "EUR",
              "billingDuration": "P1M"
            }
          },
          "publisher": {
            "@type": "Organization",
            "name": "MusicDott",
            "url": "https://musicdott.app",
            "sameAs": []
          }
        }}
      />
      <LandingNav onLoginClick={() => setLoginModalOpen(true)} />
      <LandingLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
      <main>
        <LandingHero onLoginClick={() => setLoginModalOpen(true)} />
        <LandingProblem />
        <LandingStatement />
        <LandingTeachMode />
        <LandingBlocks />
        <LandingFeatures />
        <LandingAudience />
        <LandingSocialProof />
        <LandingTestimonial />
        <LandingFaq />
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
