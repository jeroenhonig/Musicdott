import { useTranslation } from "@/lib/i18n";

export function LandingStatement() {
  const { t } = useTranslation();

  return (
    <section className="bg-[#1B2B6B] py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2
          className="font-black tracking-[-0.04em] leading-[1.02] text-white mb-5"
          style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
        >
          {t('landing.statement.h2a')}<br />
          <em className="not-italic text-[#F5B800]">{t('landing.statement.h2b')}</em>
        </h2>
        <p className="text-lg text-white/60 leading-relaxed max-w-lg mx-auto">
          {t('landing.statement.body')}
        </p>
      </div>
    </section>
  );
}
