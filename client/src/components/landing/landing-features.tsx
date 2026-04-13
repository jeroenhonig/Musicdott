import { useTranslation } from "@/lib/i18n";

export function LandingFeatures() {
  const { t } = useTranslation();

  const FEATURES = [
    {
      icon: "📅",
      title: t('landing.features.1.title'),
      body: t('landing.features.1.body'),
    },
    {
      icon: "💰",
      title: t('landing.features.2.title'),
      body: t('landing.features.2.body'),
    },
    {
      icon: "📚",
      title: t('landing.features.3.title'),
      body: t('landing.features.3.body'),
    },
    {
      icon: "🎯",
      title: t('landing.features.4.title'),
      body: t('landing.features.4.body'),
    },
    {
      icon: "🏆",
      title: t('landing.features.5.title'),
      body: t('landing.features.5.body'),
    },
    {
      icon: "📊",
      title: t('landing.features.6.title'),
      body: t('landing.features.6.body'),
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            {t('landing.features.label')}
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight">
            {t('landing.features.h2a')}<br />
            {t('landing.features.h2b')}
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            {t('landing.features.sub')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-gray-200 rounded-2xl p-7 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-[#1B2B6B] mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
