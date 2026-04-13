import { useTranslation } from "@/lib/i18n";

export function LandingProblem() {
  const { t } = useTranslation();

  const PROBLEMS = [
    {
      icon: "💬",
      title: t('landing.problem.1.title'),
      body: t('landing.problem.1.body'),
    },
    {
      icon: "🔍",
      title: t('landing.problem.2.title'),
      body: t('landing.problem.2.body'),
    },
    {
      icon: "💸",
      title: t('landing.problem.3.title'),
      body: t('landing.problem.3.body'),
    },
  ];

  return (
    <section className="bg-gray-50 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            {t('landing.problem.label')}
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight">
            {t('landing.problem.h2a')}<br />
            {t('landing.problem.h2b')}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="bg-white border border-gray-200 rounded-2xl p-7">
              <div className="text-3xl mb-4">{p.icon}</div>
              <h3 className="font-bold text-[#1B2B6B] mb-2">{p.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
