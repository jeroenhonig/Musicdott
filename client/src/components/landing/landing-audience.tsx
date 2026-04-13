import { useTranslation } from "@/lib/i18n";

interface AudienceCardProps {
  tag: string;
  title: string;
  sub: string;
  features: readonly string[];
  featured?: boolean;
}

function AudienceCard({ tag, title, sub, features, featured = false }: AudienceCardProps) {
  return (
    <div
      className={`rounded-2xl p-8 border-2 ${
        featured ? "border-[#1B2B6B] bg-[#F0F3FF]" : "border-gray-200 bg-white"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">{tag}</div>
      <h3 className="text-2xl font-black tracking-tight text-[#1B2B6B] mb-2 leading-tight">
        {title}
      </h3>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">{sub}</p>
      <ul className="space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
            <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>
            <span className="leading-relaxed">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingAudience() {
  const { t } = useTranslation();

  const ownerFeatures = [
    t('landing.audience.owner.f1'),
    t('landing.audience.owner.f2'),
    t('landing.audience.owner.f3'),
    t('landing.audience.owner.f4'),
    t('landing.audience.owner.f5'),
    t('landing.audience.owner.f6'),
    t('landing.audience.owner.f7'),
  ];

  const teacherFeatures = [
    t('landing.audience.teacher.f1'),
    t('landing.audience.teacher.f2'),
    t('landing.audience.teacher.f3'),
    t('landing.audience.teacher.f4'),
    t('landing.audience.teacher.f5'),
    t('landing.audience.teacher.f6'),
    t('landing.audience.teacher.f7'),
    t('landing.audience.teacher.f8'),
  ];

  const studentFeatures = [
    t('landing.audience.student.f1'),
    t('landing.audience.student.f2'),
    t('landing.audience.student.f3'),
    t('landing.audience.student.f4'),
    t('landing.audience.student.f5'),
    t('landing.audience.student.f6'),
    t('landing.audience.student.f7'),
    t('landing.audience.student.f8'),
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            {t('landing.audience.label')}
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight">
            {t('landing.audience.h2')}
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <AudienceCard
            tag={t('landing.audience.owner.tag')}
            title={t('landing.audience.owner.title')}
            sub={t('landing.audience.owner.sub')}
            features={ownerFeatures}
          />
          <AudienceCard
            tag={t('landing.audience.teacher.tag')}
            title={t('landing.audience.teacher.title')}
            sub={t('landing.audience.teacher.sub')}
            features={teacherFeatures}
            featured
          />
          <AudienceCard
            tag={t('landing.audience.student.tag')}
            title={t('landing.audience.student.title')}
            sub={t('landing.audience.student.sub')}
            features={studentFeatures}
          />
        </div>
      </div>
    </section>
  );
}
