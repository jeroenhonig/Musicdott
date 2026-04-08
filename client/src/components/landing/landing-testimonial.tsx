import { Star } from "lucide-react";

export function LandingTestimonial() {
  return (
    <section className="bg-gray-50 py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex justify-center gap-1 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-5 w-5 fill-[#F5B800] text-[#F5B800]" />
          ))}
        </div>
        <blockquote className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1B2B6B] italic leading-snug mb-6 max-w-2xl mx-auto">
          "MusicDott heeft fundamenteel veranderd hoe ik lesgeef. Mijn leerlingen zijn meer
          betrokken dan ooit — en ik zie precies waar iedereen staat."
        </blockquote>
        <cite className="text-sm text-gray-400 not-italic font-medium">
          — Stefan van de Brug · Eigenaar Drumschool · Nederland
        </cite>
      </div>
    </section>
  );
}
