// client/src/components/landing/landing-testimonial.tsx
import { Star } from "lucide-react";

export function LandingTestimonial() {
  return (
    <section className="py-16 px-6 bg-gray-50/70 text-center">
      <div className="flex items-center justify-center gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <blockquote className="text-xl text-gray-700 italic max-w-xl mx-auto leading-relaxed mb-4">
        "MusicDott heeft veranderd hoe we onze muziekschool runnen. De leerlingbetrokkenheid is ongelooflijk."
      </blockquote>
      <cite className="text-sm text-gray-400 not-italic">
        — Stefan van de Brug, Drumschool eigenaar, Nederland
      </cite>
    </section>
  );
}
