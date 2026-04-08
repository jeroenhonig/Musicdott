import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface LandingHeroProps {
  onLoginClick: () => void;
}

const TEACH_BLOCKS = [
  { icon: "🥁", name: "Oefenpatroon maat 1–4", type: "GrooveScribe" },
  { icon: "🎵", name: "Bladmuziek — Autumn Leaves", type: "Bladmuziek" },
  { icon: "📝", name: "Huiswerkopdracht", type: "Tekst" },
];

const QUICK_CONTROLS: Array<{ icon: string; label: string; active?: boolean }> = [
  { icon: "⏱️", label: "Timer" },
  { icon: "🥁", label: "Metronoom", active: true },
  { icon: "⏸️", label: "Pauze" },
];

const REACTIONS = ["✋ Hand opsteken", "👍 Duidelijk", "❓ Vraag"];

export function LandingHero({ onLoginClick }: LandingHeroProps) {
  const [, navigate] = useLocation();

  return (
    <section className="bg-gradient-to-b from-white to-gray-50/80">
      {/* Hero text */}
      <div className="text-center px-6 pt-24 pb-14 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#1B2B6B] text-white text-xs font-semibold tracking-wide px-4 py-1.5 rounded-full mb-7">
          🎵 Voor muziekscholen en privédocenten
        </div>
        <h1
          className="font-black tracking-[-0.04em] leading-[0.92] text-[#1B2B6B] mb-2"
          style={{ fontSize: "clamp(60px, 8.5vw, 104px)" }}
        >
          Geef les.<br />
          <span className="text-[#F5B800]">Niet administratie.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mt-7 mb-11 leading-relaxed">
          Het enige platform dat gebouwd is rondom de les — niet de boekhouding.
          Voor eigenaren, docenten én leerlingen.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-11">
          <Button
            size="lg"
            className="bg-[#1B2B6B] hover:bg-[#1B2B6B]/90 text-white shadow-[0_4px_20px_rgba(27,43,107,0.3)] px-8"
            onClick={() => navigate("/signup")}
          >
            Start gratis — 30 dagen
          </Button>
          <Button variant="outline" size="lg" onClick={onLoginClick}>
            Al een account? Log in →
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
          {["100+ muziekscholen", "Gebouwd door docenten", "AVG-compliant"].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Teach Mode preview panel — hidden on mobile */}
      <div className="hidden md:block max-w-5xl mx-auto px-6">
        <div className="bg-[#1B2B6B] rounded-t-2xl pt-3 px-3 shadow-[0_40px_100px_rgba(27,43,107,0.28)]">
          {/* Traffic-light dots */}
          <div className="flex gap-1.5 px-1 pb-3">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          {/* Split screen */}
          <div className="bg-white rounded-t-xl overflow-hidden grid grid-cols-2 min-h-[380px]">
            {/* Teacher side */}
            <div className="border-r border-gray-100 flex flex-col">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-[#1B2B6B]">
                  🎹 Teach Mode — Jazzakkoorden les 3
                </span>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                  ● Live
                </span>
              </div>
              <div className="flex flex-col gap-2 p-3 flex-1">
                {/* Active pushed block */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl border-2 border-blue-400 bg-blue-50">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm flex-shrink-0">
                    ▶️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#1B2B6B] truncate">
                      Intro video — Bill Evans
                    </div>
                    <div className="text-[10px] text-gray-400">YouTube</div>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-md flex-shrink-0">
                    Gepusht ✓
                  </span>
                </div>
                {/* Other blocks */}
                {TEACH_BLOCKS.map((block) => (
                  <div
                    key={block.name}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                      {block.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#1B2B6B] truncate">{block.name}</div>
                      <div className="text-[10px] text-gray-400">{block.type}</div>
                    </div>
                    <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md flex-shrink-0">
                      Push →
                    </span>
                  </div>
                ))}
              </div>
              {/* Quick controls */}
              <div className="grid grid-cols-3 gap-2 p-3 border-t border-gray-100">
                {QUICK_CONTROLS.map((ctrl) => (
                  <div
                    key={ctrl.label}
                    className={`rounded-xl p-2.5 text-center ${
                      ctrl.active
                        ? "border-2 border-[#1B2B6B] bg-blue-50"
                        : "border border-gray-200"
                    }`}
                  >
                    <div className="text-lg">{ctrl.icon}</div>
                    <div
                      className={`text-[10px] font-semibold mt-0.5 ${
                        ctrl.active ? "text-[#1B2B6B]" : "text-gray-400"
                      }`}
                    >
                      {ctrl.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Student side */}
            <div className="bg-[#0A0A1A] flex flex-col">
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                  Leerlingscherm
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center p-5">
                <div className="w-full bg-[#111] rounded-xl overflow-hidden aspect-video relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <span className="text-lg ml-1">▶</span>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80">
                    <span className="text-[11px] text-white/90 font-medium">
                      Bill Evans — My Foolish Heart (Live)
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-white/10 flex items-center justify-center gap-3">
                {REACTIONS.map((r) => (
                  <span
                    key={r}
                    className="text-[11px] text-white/50 bg-white/10 px-3 py-1.5 rounded-lg"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
