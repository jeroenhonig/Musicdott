const FEATURES = [
  {
    icon: "📅",
    title: "Slimme agenda",
    body: "Terugkerende lessen, dubbele boekingen voorkomen en iCal sync met Google Calendar of Apple Calendar.",
  },
  {
    icon: "💰",
    title: "Facturering",
    body: "Stripe-integratie, automatische incasso en facturen per leerling — alles op één plek.",
  },
  {
    icon: "📚",
    title: "Lesbibliotheek",
    body: "19 contentblok types: noten, video's, akkoorden, tabs, theorie, opdrachten en meer.",
  },
  {
    icon: "🎯",
    title: "Opdrachten",
    body: "Wijs huiswerk toe per leerling, volg de voortgang en geef feedback direct in de app.",
  },
  {
    icon: "🏆",
    title: "Gamificatie",
    body: "Houd leerlingen gemotiveerd met XP-punten, badges en leaderboards. Leren wordt een spel.",
  },
  {
    icon: "📊",
    title: "Rapportage",
    body: "Inzicht in voortgang, aanwezigheid en statistieken per leerling, docent en school.",
  },
];

export function LandingFeatures() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            Alles wat je nodig hebt
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight">
            Eén platform.<br />
            Alle tools.
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            Van planning tot facturering en van lesinhoud tot voortgangsrapportage — MusicDott dekt alles.
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
