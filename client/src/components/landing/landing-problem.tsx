const PROBLEMS = [
  {
    icon: "💬",
    title: "Lesprogramma's via WhatsApp",
    body: "Huiswerk, noten en feedback verspreid over tientallen apps. Niemand weet meer wat de afspraak was.",
  },
  {
    icon: "🔍",
    title: "Geen zicht op voortgang",
    body: "Je weet niet hoe een leerling vorige week presteerde, welke doelen behaald zijn of waar hij vastloopt.",
  },
  {
    icon: "📅",
    title: "Rooster dat chaos veroorzaakt",
    body: "Dubbele boekingen, gemiste lessen en vakanties die te laat worden ingepland.",
  },
];

export function LandingProblem() {
  return (
    <section className="bg-gray-50 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            Klinkt dit bekend?
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight">
            Muziekles is geweldig.<br />
            De rommel eromheen niet.
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
