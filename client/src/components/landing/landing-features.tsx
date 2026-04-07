// client/src/components/landing/landing-features.tsx
import { Users, Music, Trophy, Calendar, CreditCard, BarChart, LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  { icon: Users, title: "Leerlingbeheer", description: "Overzicht van voortgang, opdrachten en prestaties per leerling." },
  { icon: Music, title: "Interactieve lessen", description: "Maak multimedia-lessen met bladmuziek, audio en video." },
  { icon: Trophy, title: "Achievement systeem", description: "Badges en mijlpalen houden leerlingen gemotiveerd." },
  { icon: Calendar, title: "Slim rooster", description: "Visuele agenda met conflictdetectie en automatische herinneringen." },
  { icon: CreditCard, title: "Automatische facturering", description: "Abonnementsbeheer dat meegroeit met je leerlingaantal." },
  { icon: BarChart, title: "Analyses & inzichten", description: "Begrijp groei, prestaties en kansen in één dashboard." },
];

export function LandingFeatures() {
  return (
    <section className="py-20 px-6 max-w-5xl mx-auto">
      <p className="text-xs font-semibold tracking-widest text-primary uppercase text-center mb-3">
        Alles in één platform
      </p>
      <h2 className="text-3xl font-bold tracking-tight text-center mb-3">Alles wat je nodig hebt</h2>
      <p className="text-gray-500 text-center mb-14 max-w-lg mx-auto">
        Geen losse tools meer. MusicDott combineert alles in één rustige omgeving.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="p-6 border border-gray-100 rounded-2xl hover:border-gray-200 transition-colors">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
