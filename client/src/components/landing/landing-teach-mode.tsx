import { useTranslation } from "@/lib/i18n";

const MINI_BLOCKS = [
  { icon: "🥁", name: "Patroon 1–4" },
  { icon: "🎵", name: "Bladmuziek" },
];

export function LandingTeachMode() {
  const { t } = useTranslation();

  const BULLETS = [
    { icon: "▶️", text: t('landing.teachMode.bullet1') },
    { icon: "⏱️", text: t('landing.teachMode.bullet2') },
    { icon: "🥁", text: t('landing.teachMode.bullet3') },
    { icon: "✋", text: t('landing.teachMode.bullet4') },
    { icon: "⏸️", text: t('landing.teachMode.bullet5') },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Text */}
        <div>
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-5">
            {t('landing.teachMode.label')}
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight mb-5">
            {t('landing.teachMode.h2a')}<br />
            {t('landing.teachMode.h2b')}
          </h2>
          <p className="text-gray-500 leading-relaxed mb-7">
            {t('landing.teachMode.body')}
          </p>
          <ul className="space-y-3">
            {BULLETS.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                <span className="leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mini Teach Mode mockup */}
        <div>
          <div className="bg-[#1B2B6B] rounded-2xl pt-3 px-3 shadow-[0_20px_60px_rgba(27,43,107,0.2)]">
            <div className="flex gap-1.5 px-1 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div
              className="bg-white rounded-t-xl overflow-hidden grid grid-cols-2"
              style={{ minHeight: 280 }}
            >
              {/* Teacher mini */}
              <div className="border-r border-gray-100 p-3">
                <div className="text-[10px] font-bold text-[#1B2B6B] mb-3">{t('landing.teachMode.mini.label')}</div>
                {/* Active block */}
                <div className="flex items-center gap-2 p-2 rounded-lg border-2 border-blue-400 bg-blue-50 mb-2">
                  <span className="text-sm">▶️</span>
                  <span className="text-[10px] font-semibold text-[#1B2B6B] flex-1 truncate">
                    Intro video
                  </span>
                  <span className="text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded">
                    ✓
                  </span>
                </div>
                {MINI_BLOCKS.map((b) => (
                  <div
                    key={b.name}
                    className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 mb-2"
                  >
                    <span className="text-sm">{b.icon}</span>
                    <span className="text-[10px] font-semibold text-[#1B2B6B] flex-1 truncate">
                      {b.name}
                    </span>
                    <span className="text-[9px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                      →
                    </span>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-1 mt-3">
                  {["⏱️ Timer", "🥁 Metro", "⏸️ Pause"].map((c) => (
                    <div
                      key={c}
                      className="bg-blue-50 border border-gray-200 rounded-lg p-1.5 text-center text-[9px] font-bold text-[#1B2B6B]"
                    >
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              {/* Student mini */}
              <div className="bg-[#0A0A1A] flex items-center justify-center p-4">
                <div className="w-full bg-[#1a1a2e] rounded-lg aspect-video flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                    <span className="text-xs ml-0.5">▶</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
