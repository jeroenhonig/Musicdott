import { useLocation } from "wouter";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPricingText } from "@/lib/currency-utils";

export function LandingPricing() {
  const [, navigate] = useLocation();
  const pricing = getPricingText(29.95, 49.95);

  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            Eerlijke prijzen
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] mb-3 leading-tight">
            Kies wat bij je past
          </h2>
          <p className="text-lg text-gray-500">
            Geen verborgen kosten. Eenvoudig opschalen als je school groeit.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Standard */}
          <div className="p-8 border-2 border-gray-200 rounded-2xl">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
              Standard
            </p>
            <div className="text-5xl font-light tracking-tight text-[#1B2B6B] mb-6">
              {pricing.standard}
              <span className="text-base font-normal text-gray-400">/maand</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              {[
                "Tot 25 leerlingen",
                "1 docentaccount",
                "Onbeperkte lessen & content",
                "Voortgangsregistratie per leerling",
                "Basisrapportages & analyses",
                "Rooster en planning",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full border-gray-300"
              onClick={() => navigate("/signup")}
            >
              Kies Standard
            </Button>
          </div>

          {/* Pro */}
          <div className="relative p-8 border-2 border-[#1B2B6B] rounded-2xl bg-[#F0F3FF]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-[#F5B800] text-[#1B2B6B] text-xs font-black px-4 py-1 rounded-full whitespace-nowrap">
                Meest gekozen
              </span>
            </div>
            <p className="text-xs font-bold text-[#1B2B6B] uppercase tracking-widest mb-1">Pro</p>
            <div className="text-5xl font-light tracking-tight text-[#1B2B6B] mb-6">
              {pricing.pro}
              <span className="text-base font-normal text-gray-400">/maand</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 mb-8">
              {[
                "Tot 50 leerlingen",
                "Onbeperkte docentaccounts",
                "Teach Mode — live leerlingscherm",
                "Geavanceerde analyses & inzichten",
                "Prioriteitsondersteuning",
                "Eigen branding en schoolkleuren",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              className="w-full bg-[#1B2B6B] hover:bg-[#1B2B6B]/90 text-white"
              onClick={() => navigate("/signup")}
            >
              Kies Pro
            </Button>
          </div>
        </div>
        <p className="mt-6 text-xs text-center text-gray-400">
          Meer leerlingen? {pricing.extraStudents} per 5 leerlingen/maand ·{" "}
          30 dagen niet-goed-geld-terug · Geen opstartkosten · Opzeggen wanneer je wilt
        </p>
      </div>
    </section>
  );
}
