// client/src/components/landing/landing-pricing.tsx
import { useLocation } from "wouter";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPricingText } from "@/lib/currency-utils";

export function LandingPricing() {
  const [, navigate] = useLocation();
  const pricing = getPricingText(29.95, 49.95);

  return (
    <section className="py-20 px-6 max-w-3xl mx-auto text-center">
      <h2 className="text-3xl font-bold tracking-tight mb-3">Eerlijke prijzen</h2>
      <p className="text-gray-500 mb-14">
        Kies het plan dat past bij jouw school. Eenvoudig opschalen als je groeit.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
        {/* Standard */}
        <div className="p-8 border border-gray-200 rounded-2xl">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Standard</p>
          <div className="text-4xl font-light tracking-tight mb-6">
            {pricing.standard}<span className="text-base text-gray-400">/maand</span>
          </div>
          <ul className="space-y-3 text-sm text-gray-600 mb-8">
            {[
              "Tot 25 leerlingen",
              "1 docentaccount",
              "Onbeperkte lessen & content",
              "Voortgangsregistratie leerlingen",
              "Basisrapportages & analyses",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" onClick={() => navigate("/signup")}>
            Kies Standard
          </Button>
        </div>

        {/* Pro */}
        <div className="relative p-8 border border-primary/30 rounded-2xl bg-primary/5">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-primary text-white text-xs px-3 py-1 rounded-full font-medium">
              Meest gekozen
            </span>
          </div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Pro</p>
          <div className="text-4xl font-light tracking-tight mb-6">
            {pricing.pro}<span className="text-base text-gray-400">/maand</span>
          </div>
          <ul className="space-y-3 text-sm text-gray-600 mb-8">
            {[
              "Tot 50 leerlingen",
              "Onbeperkte docentaccounts",
              "Geavanceerde analyses & inzichten",
              "Prioriteit support",
              "Custom branding opties",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Button className="w-full" onClick={() => navigate("/signup")}>
            Kies Pro
          </Button>
        </div>
      </div>
      <p className="mt-6 text-xs text-gray-400">
        Meer leerlingen? {pricing.extraStudents} per 5 leerlingen/maand ·{" "}
        30 dagen niet-goed-geld-terug · Geen opstartkosten · Opzeggen wanneer je wilt
      </p>
    </section>
  );
}
