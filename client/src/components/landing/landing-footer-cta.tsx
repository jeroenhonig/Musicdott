// client/src/components/landing/landing-footer-cta.tsx
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function LandingFooterCta() {
  const [, navigate] = useLocation();

  return (
    <section className="py-20 px-6 text-center border-t border-gray-100">
      <h2 className="text-3xl font-bold tracking-tight mb-3">Klaar om te beginnen?</h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Sluit je aan bij honderden muziekdocenten die MusicDott al gebruiken.
      </p>
      <Button size="lg" onClick={() => navigate("/signup")}>
        Start gratis — geen creditcard nodig
      </Button>
      <p className="mt-4 text-xs text-gray-400">
        30 dagen gratis · Volledige toegang · Opzeggen wanneer je wilt
      </p>
      <p className="mt-8 text-xs text-gray-300">Proudly built in The Netherlands 🇳🇱</p>
    </section>
  );
}
