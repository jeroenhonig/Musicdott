const EIGENAAR_FEATURES = [
  "Meerdere docenten en klassen beheren",
  "Dashboard met leerlingen, lessen en activiteit",
  "Analyses: wie loopt achter, wat werkt?",
  "Vakantieperiodes en roosterbeheer",
  "Eigen branding: logo, kleuren, schoolnaam",
  "Leerlingen uitnodigen en koppelen aan docenten",
  "AVG-compliant zonder extra moeite",
];

const DOCENT_FEATURES = [
  "Lessen bouwen met 19 bloktypen",
  "Teach Mode: stuur content live naar de leerling",
  "Timer en metronoom vanuit de les bedienen",
  "Voortgang en prestaties per leerling volgen",
  "Opdrachten met deadlines toewijzen",
  "Rooster met terugkerende lessen",
  "Leerlingen sturen een vraag via de app",
  "Achievements en punten uitdelen",
];

const LEERLING_FEATURES = [
  "Alle toegewezen lessen direct beschikbaar",
  "Opdrachten met deadlines en status",
  "Eigen rooster en geplande lessen",
  "Achievements, badges en punten verdienen",
  "Ranglijst: wie heeft de meeste punten?",
  "Beloningswinkel: punten inwisselen",
  "Vragen stellen aan de docent",
  "Oefensessies bijhouden",
];

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
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            Voor iedereen in de muziekles
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight">
            Drie mensen. Één platform.
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <AudienceCard
            tag="Voor de schooleigenaar"
            title="Jouw school, onder controle"
            sub="Compleet overzicht van leerlingen, docenten en lesinhoud — zonder spreadsheets."
            features={EIGENAAR_FEATURES}
          />
          <AudienceCard
            tag="Voor de docent"
            title="Gewoon goede les geven"
            sub="Alles wat je nodig hebt om geweldige lessen te bouwen en je leerlingen écht te leren kennen."
            features={DOCENT_FEATURES}
            featured
          />
          <AudienceCard
            tag="Voor de leerling"
            title="Muziek leren op jouw manier"
            sub="Een eigen omgeving met alle lessen, opdrachten en behaalde mijlpalen op één plek."
            features={LEERLING_FEATURES}
          />
        </div>
      </div>
    </section>
  );
}
