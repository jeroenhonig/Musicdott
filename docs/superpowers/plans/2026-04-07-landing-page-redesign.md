# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the MusicDott `/auth` landing page into a high-converting, Apple-minimalist sales page with Teach Mode as the hero differentiator, serving school owners, teachers, and students.

**Architecture:** 11 tasks — 10 component rewrites/creates and 1 auth-page wiring update. All components are purely presentational (no new server calls, no new state management). Brand colors use Tailwind arbitrary values (`bg-[#1B2B6B]`, `text-[#F5B800]`) since they are not in the default palette. TypeScript check after each task confirms no regressions.

**Tech Stack:** React 18, TypeScript, Tailwind CSS arbitrary values, wouter (`useLocation`), shadcn/ui `Button`, lucide-react `Star`/`CheckCircle`, `@/lib/currency-utils` `getPricingText`, `@/components/language/language-selector` `CompactLanguageSelector`

---

## Chunk 1: Nav, Hero, Problem, Statement, Teach Mode

### Task 1: Rewrite `landing-nav.tsx`

**Files:**
- Modify: `client/src/components/landing/landing-nav.tsx`

These are presentational components — TypeScript compile is the verification step.

- [ ] **Step 1: Rewrite the file**

```tsx
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CompactLanguageSelector } from "@/components/language/language-selector";
import musicdottLogo from "@/assets/musicdott-logo.png";

interface LandingNavProps {
  onLoginClick: () => void;
}

export function LandingNav({ onLoginClick }: LandingNavProps) {
  const [, navigate] = useLocation();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-12 h-16 bg-white/95 backdrop-blur-xl border-b border-gray-200">
      <img src={musicdottLogo} alt="MusicDott" className="h-9 w-auto" />
      <div className="flex items-center gap-2">
        <CompactLanguageSelector />
        <Button variant="ghost" size="sm" onClick={onLoginClick}>
          Inloggen
        </Button>
        <Button
          size="sm"
          className="bg-[#1B2B6B] hover:bg-[#1B2B6B]/90 text-white"
          onClick={() => navigate("/signup")}
        >
          Start gratis →
        </Button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1 | grep "landing-nav" || echo "✅ No errors in landing-nav"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-nav.tsx
git commit -m "feat(landing): rewrite nav with navy CTA and logo"
```

---

### Task 2: Rewrite `landing-hero.tsx` with Teach Mode panel

**Files:**
- Modify: `client/src/components/landing/landing-hero.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
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

const QUICK_CONTROLS = [
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
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md flex-shrink-0">
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1 | grep "landing-hero" || echo "✅ No errors in landing-hero"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-hero.tsx
git commit -m "feat(landing): rewrite hero with Teach Mode preview panel"
```

---

### Task 3: Create `landing-problem.tsx`

**Files:**
- Create: `client/src/components/landing/landing-problem.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1 | grep "landing-problem" || echo "✅ No errors in landing-problem"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-problem.tsx
git commit -m "feat(landing): add LandingProblem section"
```

---

### Task 4: Create `landing-statement.tsx`

**Files:**
- Create: `client/src/components/landing/landing-statement.tsx`

- [ ] **Step 1: Create the file**

```tsx
export function LandingStatement() {
  return (
    <section className="bg-[#1B2B6B] py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2
          className="font-black tracking-[-0.04em] leading-[1.02] text-white mb-5"
          style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
        >
          Eén platform.<br />
          <em className="not-italic text-[#F5B800]">Gebouwd voor de docent.</em>
        </h2>
        <p className="text-lg text-white/60 leading-relaxed max-w-lg mx-auto">
          MusicDott is niet gebouwd voor de administrateur of de schooldirecteur.
          Het is gebouwd voor jou — de docent die betrokken wil zijn, lessen wil
          maken die blijven hangen, en precies wil weten hoe zijn leerlingen groeien.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1 | grep "landing-statement" || echo "✅ No errors in landing-statement"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-statement.tsx
git commit -m "feat(landing): add LandingStatement positioning section"
```

---

### Task 5: Create `landing-teach-mode.tsx`

**Files:**
- Create: `client/src/components/landing/landing-teach-mode.tsx`

- [ ] **Step 1: Create the file**

```tsx
const BULLETS = [
  { icon: "▶️", text: "Push video's, bladmuziek en oefenpatronen met één klik" },
  { icon: "⏱️", text: "Stuur een afteltimer rechtstreeks naar de leerling" },
  { icon: "🥁", text: "Activeer de metronoom op het leerlingscherm" },
  { icon: "✋", text: "Leerlingen sturen feedback: hand opsteken, vraag stellen" },
  { icon: "⏸️", text: "Pauzeer en stuur een bericht naar het scherm" },
];

const MINI_BLOCKS = [
  { icon: "🥁", name: "Patroon 1–4" },
  { icon: "🎵", name: "Bladmuziek" },
];

export function LandingTeachMode() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Text */}
        <div>
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-5">
            Unieke functie
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] leading-tight mb-5">
            Stuur je les live<br />
            naar het scherm<br />
            van de leerling
          </h2>
          <p className="text-gray-500 leading-relaxed mb-7">
            Met Teach Mode bepaal jij wat de leerling ziet. Druk op een blok en het
            verschijnt direct op zijn scherm — of je nu in dezelfde kamer zit of
            online lesgeeft.
          </p>
          <ul className="space-y-3">
            {BULLETS.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                <span className="leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mini Teach Mode mockup */}
        <div>
          <div className="bg-[#1B2B6B] rounded-2xl pt-3 px-3 shadow-[0_20px_60px_rgba(27,43,107,0.2)]">
            <div className="flex gap-1.5 px-1 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div
              className="bg-white rounded-t-xl overflow-hidden grid grid-cols-2"
              style={{ minHeight: 280 }}
            >
              {/* Teacher mini */}
              <div className="border-r border-gray-100 p-3">
                <div className="text-[10px] font-bold text-[#1B2B6B] mb-3">🎹 Teach Mode</div>
                {/* Active block */}
                <div className="flex items-center gap-2 p-2 rounded-lg border-2 border-blue-400 bg-blue-50 mb-2">
                  <span className="text-sm">▶️</span>
                  <span className="text-[10px] font-semibold text-[#1B2B6B] flex-1 truncate">
                    Intro video
                  </span>
                  <span className="text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded">
                    ✓
                  </span>
                </div>
                {MINI_BLOCKS.map((b) => (
                  <div
                    key={b.name}
                    className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 mb-2"
                  >
                    <span className="text-sm">{b.icon}</span>
                    <span className="text-[10px] font-semibold text-[#1B2B6B] flex-1 truncate">
                      {b.name}
                    </span>
                    <span className="text-[9px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                      →
                    </span>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-1 mt-3">
                  {["⏱️ Timer", "🥁 Metro", "⏸️ Pause"].map((c) => (
                    <div
                      key={c}
                      className="bg-blue-50 border border-gray-200 rounded-lg p-1.5 text-center text-[9px] font-bold text-[#1B2B6B]"
                    >
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              {/* Student mini */}
              <div className="bg-[#0A0A1A] flex items-center justify-center p-4">
                <div className="w-full bg-[#1a1a2e] rounded-lg aspect-video flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                    <span className="text-xs ml-0.5">▶</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1 | grep "landing-teach" || echo "✅ No errors in landing-teach-mode"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-teach-mode.tsx
git commit -m "feat(landing): add LandingTeachMode feature section"
```

---

## Chunk 2: Blocks, Audience, Testimonial, Pricing, Footer CTA, Wiring

### Task 6: Create `landing-blocks.tsx`

**Files:**
- Create: `client/src/components/landing/landing-blocks.tsx`

**Note:** Do NOT copy anything from the old `landing-features.tsx`. Write this from scratch.

- [ ] **Step 1: Create the file**

```tsx
const BLOCKS = [
  { icon: "▶️", title: "YouTube", sub: "Video-uitleg" },
  { icon: "🥁", title: "GrooveScribe", sub: "Drumpatronen" },
  { icon: "🎵", title: "Bladmuziek", sub: "Notatie" },
  { icon: "🎸", title: "Tablature", sub: "Gitaartabs" },
  { icon: "📄", title: "PDF", sub: "Partituren" },
  { icon: "🎼", title: "Flat.io", sub: "Interactieve noten" },
  { icon: "🔤", title: "ABC-notatie", sub: "Tekstnotatie" },
  { icon: "🎧", title: "Spotify", sub: "Voorbeeldtracks" },
  { icon: "🍎", title: "Apple Music", sub: "Muziekbibliotheek" },
  { icon: "📝", title: "Tekst", sub: "Uitleg & theorie" },
  { icon: "🔊", title: "Audio", sub: "Oefenopnames" },
  { icon: "🖼️", title: "Afbeeldingen", sub: "Foto's & schema's" },
  { icon: "🎯", title: "Akkoorddiagram", sub: "Akkoordschema's" },
  { icon: "🎤", title: "Songtekst", sub: "Teksten & lyrics" },
  { icon: "🎙️", title: "Audio → Noten", sub: "Transcriptie" },
  { icon: "🔗", title: "Externe link", sub: "Webinhoud" },
  { icon: "🔄", title: "Sync-embed", sub: "Gesynchroniseerd" },
  { icon: "🗂️", title: "Galerij", sub: "Fotogalerij" },
  { icon: "🃏", title: "Rich link", sub: "Link met preview" },
] as const;

export function LandingBlocks() {
  return (
    <section className="bg-gray-50 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex text-xs font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full mb-4">
            Lesinhoud
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-[#1B2B6B] mb-3 leading-tight">
            19 bloktypen voor élke les
          </h2>
          <p className="text-lg text-gray-500 max-w-md mx-auto">
            Van bladmuziek tot YouTube, van drumtabs tot Spotify. Alles in één leseditor.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {BLOCKS.map((block) => (
            <div
              key={block.title}
              className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-[#1B2B6B]/30 transition-colors"
            >
              <span className="text-xl flex-shrink-0">{block.icon}</span>
              <div>
                <div className="text-sm font-semibold text-[#1B2B6B]">{block.title}</div>
                <div className="text-xs text-gray-400">{block.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1 | grep "landing-blocks" || echo "✅ No errors in landing-blocks"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-blocks.tsx
git commit -m "feat(landing): add LandingBlocks 19-block-type showcase"
```

---

### Task 7: Create `landing-audience.tsx`

**Files:**
- Create: `client/src/components/landing/landing-audience.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1 | grep "landing-audience" || echo "✅ No errors in landing-audience"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-audience.tsx
git commit -m "feat(landing): add LandingAudience three-column section"
```

---

### Task 8: Minor rewrite of `landing-testimonial.tsx`

**Files:**
- Modify: `client/src/components/landing/landing-testimonial.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1 | grep "landing-testimonial" || echo "✅ No errors in landing-testimonial"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-testimonial.tsx
git commit -m "feat(landing): update testimonial with navy/yellow brand colors"
```

---

### Task 9: Minor rewrite of `landing-pricing.tsx`

**Files:**
- Modify: `client/src/components/landing/landing-pricing.tsx`

Key changes: label pill, navy/yellow brand colors, yellow "Meest gekozen" badge, Teach Mode in Pro list, fix "Prioriteit support" → "Prioriteitsondersteuning", fix "Custom branding opties" → "Eigen branding", add "Rooster en planning" to Standard, section heading updated.

- [ ] **Step 1: Rewrite the file**

```tsx
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1 | grep "landing-pricing" || echo "✅ No errors in landing-pricing"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-pricing.tsx
git commit -m "feat(landing): update pricing with navy/yellow colors and Teach Mode"
```

---

### Task 10: Rewrite `landing-footer-cta.tsx`

**Files:**
- Modify: `client/src/components/landing/landing-footer-cta.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function LandingFooterCta() {
  const [, navigate] = useLocation();

  return (
    <section className="bg-[#1B2B6B] py-24 px-6 text-center">
      <div className="max-w-2xl mx-auto">
        <h2
          className="font-black tracking-[-0.04em] leading-[1.02] text-white mb-4"
          style={{ fontSize: "clamp(36px, 5vw, 60px)" }}
        >
          Klaar om anders{" "}
          <em className="not-italic text-[#F5B800]">les te geven?</em>
        </h2>
        <p className="text-lg text-white/60 mb-10 max-w-md mx-auto leading-relaxed">
          Sluit je aan bij honderden muziekdocenten die MusicDott al gebruiken.
        </p>
        <Button
          size="lg"
          className="bg-[#F5B800] hover:bg-[#F5B800]/90 text-[#1B2B6B] font-black px-10 shadow-[0_4px_28px_rgba(245,184,0,0.4)]"
          onClick={() => navigate("/signup")}
        >
          Start gratis — geen creditcard nodig
        </Button>
        <p className="mt-4 text-xs text-white/40">
          30 dagen gratis · Volledige toegang · Opzeggen wanneer je wilt
        </p>
        <p className="mt-8 text-xs text-white/25">Proudly built in The Netherlands 🇳🇱</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1 | grep "landing-footer" || echo "✅ No errors in landing-footer-cta"
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-footer-cta.tsx
git commit -m "feat(landing): rewrite footer CTA with navy bg and yellow button"
```

---

### Task 11: Wire `auth-page.tsx` + delete `landing-features.tsx`

**Files:**
- Modify: `client/src/pages/auth-page.tsx`
- Delete: `client/src/components/landing/landing-features.tsx`

- [ ] **Step 1: Replace `auth-page.tsx` with updated composition**

Replace the entire file content with:

```tsx
// client/src/pages/auth-page.tsx
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { PasswordChangeDialog } from "@/components/password-change-dialog";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingLoginModal } from "@/components/landing/landing-login-modal";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingProblem } from "@/components/landing/landing-problem";
import { LandingStatement } from "@/components/landing/landing-statement";
import { LandingTeachMode } from "@/components/landing/landing-teach-mode";
import { LandingBlocks } from "@/components/landing/landing-blocks";
import { LandingAudience } from "@/components/landing/landing-audience";
import { LandingTestimonial } from "@/components/landing/landing-testimonial";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingFooterCta } from "@/components/landing/landing-footer-cta";

export default function AuthPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.mustChangePassword) {
        setLoginModalOpen(false);
        setShowPasswordChange(true);
      } else {
        if (user.role === "platform_owner") {
          navigate("/owners-dashboard");
        } else {
          navigate("/");
        }
      }
    }
  }, [user, navigate]);

  const handlePasswordChangeClose = () => {
    setShowPasswordChange(false);
    if (user && !user.mustChangePassword) {
      if (user.role === "platform_owner") {
        navigate("/owners-dashboard");
      } else {
        navigate("/");
      }
    }
  };

  return (
    <>
      <LandingNav onLoginClick={() => setLoginModalOpen(true)} />
      <LandingLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
      <main>
        <LandingHero onLoginClick={() => setLoginModalOpen(true)} />
        <LandingProblem />
        <LandingStatement />
        <LandingTeachMode />
        <LandingBlocks />
        <LandingAudience />
        <LandingTestimonial />
        <LandingPricing />
        <LandingFooterCta />
      </main>
      <PasswordChangeDialog
        isOpen={showPasswordChange}
        onClose={handlePasswordChangeClose}
        isForced={!!user?.mustChangePassword}
      />
    </>
  );
}
```

- [ ] **Step 2: Delete `landing-features.tsx`**

```bash
rm client/src/components/landing/landing-features.tsx
```

- [ ] **Step 3: Full TypeScript check — must be clean**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
node node_modules/.bin/tsc --noEmit 2>&1
```

Expected: no output (zero errors). If errors appear, fix them before proceeding.

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
SESSION_SECRET=test-session-secret-for-ci-runs-only-1234 node node_modules/.bin/vitest run 2>&1 | tail -8
```

Expected: all tests pass (103 passing).

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/auth-page.tsx
git rm client/src/components/landing/landing-features.tsx
git commit -m "feat(landing): wire all new sections in auth-page, remove landing-features"
```
