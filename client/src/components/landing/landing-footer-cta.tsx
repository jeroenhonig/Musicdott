import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function LandingFooterCta() {
  const [, navigate] = useLocation();

  return (
    <section className="bg-[#1B2B6B] py-24 px-6 text-center">
      <div className="max-w-2xl mx-auto">
        <h2
          className="font-black tracking-[-0.04em] leading-[1.02] text-white mb-4"
          style={{ fontSize: "clamp(36px, 5vw, 60px)" }}
        >
          Klaar om anders{" "}
          <em className="not-italic text-[#F5B800]">les te geven?</em>
        </h2>
        <p className="text-lg text-white/60 mb-10 max-w-md mx-auto leading-relaxed">
          Sluit je aan bij honderden muziekdocenten die MusicDott al gebruiken.
        </p>
        <Button
          size="lg"
          className="bg-[#F5B800] hover:bg-[#F5B800]/90 text-[#1B2B6B] font-black px-10 shadow-[0_4px_28px_rgba(245,184,0,0.4)]"
          onClick={() => navigate("/signup")}
        >
          Start gratis — geen creditcard nodig
        </Button>
        <p className="mt-4 text-xs text-white/40">
          30 dagen gratis · Volledige toegang · Opzeggen wanneer je wilt
        </p>
        <p className="mt-8 text-xs text-white/25">Proudly built in The Netherlands 🇳🇱</p>
      </div>
    </section>
  );
}
