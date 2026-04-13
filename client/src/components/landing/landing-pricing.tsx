import { useLocation } from "wouter";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPricingText } from "@/lib/currency-utils";
import { useTranslation } from "@/lib/i18n";

export function LandingPricing() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const pricing = getPricingText(29.95, 49.95);

  const standardFeatures = [
    t('landing.pricing.standard.f1'),
    t('landing.pricing.standard.f2'),
    t('landing.pricing.standard.f3'),
    t('landing.pricing.standard.f4'),
    t('landing.pricing.standard.f5'),
    t('landing.pricing.standard.f6'),
  ];

  const proFeatures = [
    t('landing.pricing.pro.f1'),
    t('landing.pricing.pro.f2'),
    t('landing.pricing.pro.f3'),
    t('landing.pricing.pro.f4'),
    t('landing.pricing.pro.f5'),
    t('landing.pricing.pro.f6'),
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            {t('landing.pricing.label')}
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] mb-3 leading-tight">
            {t('landing.pricing.h2')}
          </h2>
          <p className="text-lg text-gray-500">
            {t('landing.pricing.sub')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Standard */}
          <div className="p-8 border-2 border-gray-200 rounded-2xl">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
              {t('landing.pricing.standard.name')}
            </p>
            <div className="text-5xl font-light tracking-tight text-[#1B2B6B] mb-6">
              {pricing.standard}
              <span className="text-base font-normal text-gray-400">{t('landing.pricing.perMonth')}</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              {standardFeatures.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full border-gray-300"
              onClick={() => navigate("/signup")}
            >
              {t('landing.pricing.standard.cta')}
            </Button>
          </div>

          {/* Pro */}
          <div className="relative p-8 border-2 border-[#1B2B6B] rounded-2xl bg-[#F0F3FF]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-[#F5B800] text-[#1B2B6B] text-xs font-black px-4 py-1 rounded-full whitespace-nowrap">
                {t('landing.pricing.pro.badge')}
              </span>
            </div>
            <p className="text-xs font-bold text-[#1B2B6B] uppercase tracking-widest mb-1">Pro</p>
            <div className="text-5xl font-light tracking-tight text-[#1B2B6B] mb-6">
              {pricing.pro}
              <span className="text-base font-normal text-gray-400">{t('landing.pricing.perMonth')}</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              {proFeatures.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              className="w-full bg-[#1B2B6B] hover:bg-[#1B2B6B]/90 text-white"
              onClick={() => navigate("/signup")}
            >
              {t('landing.pricing.pro.cta')}
            </Button>
          </div>
        </div>
        <p className="mt-6 text-xs text-center text-gray-400">
          {t('landing.pricing.footerNote', { extra: pricing.extraStudents })}
        </p>
      </div>
    </section>
  );
}
