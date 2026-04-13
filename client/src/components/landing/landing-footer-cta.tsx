import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export function LandingFooterCta() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <section className="bg-[#1B2B6B] py-24 px-6 text-center">
      <div className="max-w-2xl mx-auto">
        <h2
          className="font-black tracking-[-0.04em] leading-[1.02] text-white mb-4"
          style={{ fontSize: "clamp(36px, 5vw, 60px)" }}
        >
          {t('landing.footerCta.h2a')}{" "}
          <em className="not-italic text-[#F5B800]">{t('landing.footerCta.h2b')}</em>
        </h2>
        <p className="text-lg text-white/60 mb-10 max-w-md mx-auto leading-relaxed">
          {t('landing.footerCta.sub')}
        </p>
        <Button
          size="lg"
          className="bg-[#F5B800] hover:bg-[#F5B800]/90 text-[#1B2B6B] font-black px-10 shadow-[0_4px_28px_rgba(245,184,0,0.4)]"
          onClick={() => navigate("/signup")}
        >
          {t('landing.footerCta.cta')}
        </Button>
        <p className="mt-4 text-xs text-white/40">
          {t('landing.footerCta.legal')}
        </p>
        <p className="mt-8 text-xs text-white/25">{t('landing.footerCta.madeIn')}</p>
      </div>
    </section>
  );
}
