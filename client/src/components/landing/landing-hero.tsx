// client/src/components/landing/landing-hero.tsx
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface LandingHeroProps {
  onLoginClick: () => void;
}

export function LandingHero({ onLoginClick }: LandingHeroProps) {
  const [, navigate] = useLocation();

  return (
    <section className="py-24 px-6 text-center max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-600 mb-8">
        🎵 Voor muziekscholen en privédocenten
      </div>
      <h1 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-5">
        Onderwijs dat werkt.<br />
        <span className="text-primary">Beheer dat verdwijnt.</span>
      </h1>
      <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto mb-10">
        MusicDott stroomlijnt je muziekschool zodat jij je kunt richten op wat echt telt: muziek maken met je leerlingen.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button size="lg" onClick={() => navigate("/signup")}>
          Start gratis — 30 dagen
        </Button>
        <Button variant="outline" size="lg" onClick={onLoginClick}>
          Al een account? Log in →
        </Button>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
        {[
          "100+ muziekscholen",
          "Gebouwd door docenten",
          "AVG-compliant",
        ].map((item) => (
          <span key={item} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
