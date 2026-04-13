import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Marieke de Vries",
    role: "Pianodocente",
    school: "Muziekschool Harmonie, Amsterdam",
    quote:
      "Eindelijk een platform dat écht gemaakt is voor muziekleraren. Het Lesscherm is een gamechanger — mijn leerlingen zijn zoveel meer betrokken dan vroeger.",
  },
  {
    name: "Thomas Akkerman",
    role: "Gitaarleraar",
    school: "Privéstudio, Rotterdam",
    quote:
      "De automatische facturering alleen al bespaart me uren per maand. Nu houd ik me bezig met lesgeven in plaats van administratie.",
  },
  {
    name: "Fatima El Bouhali",
    role: "Schooldirecteur",
    school: "Academie voor Muziek & Dans, Utrecht",
    quote:
      "We zijn van 3 verschillende tools naar MusicDott gegaan. Onze docenten waren sceptisch, maar na een week wilden ze niet meer terug.",
  },
];

const SCHOOL_LOGOS = [
  "Muziekschool Harmonie",
  "Academie voor Muziek & Dans",
  "Drumschool Noord",
  "Conservatorium Junior",
];

export function LandingSocialProof() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            Wat leraren zeggen
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight">
            Vertrouwd door muziekleraren<br />
            door heel Nederland
          </h2>
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white border border-gray-200 rounded-2xl p-7 flex flex-col gap-4"
            >
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#F5B800] text-[#F5B800]" />
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">"{t.quote}"</p>
              <div>
                <p className="font-semibold text-[#1B2B6B] text-sm">{t.name}</p>
                <p className="text-xs text-gray-400">{t.role} · {t.school}</p>
              </div>
            </div>
          ))}
        </div>

        {/* School logos row */}
        <div className="border-t border-gray-100 pt-12">
          <p className="text-center text-xs font-bold tracking-widest uppercase text-gray-400 mb-8">
            Gebruikt door scholen door heel Nederland
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {SCHOOL_LOGOS.map((name) => (
              <div
                key={name}
                className="bg-gray-100 rounded-xl px-6 py-3 text-xs font-semibold text-gray-500 tracking-wide"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
