# Landing Page Redesign — Design Spec

**Date:** 2026-04-07
**Status:** Approved

## Goal

Redesign the existing landing page components in `client/src/components/landing/` into a high-converting, Apple-minimalist sales page that serves school owners, teachers, and students simultaneously. The page must communicate MusicDott's unique value — a lesson-first platform, not an admin tool — and highlight Teach Mode as the standout differentiator.

## Design Direction

- **Aesthetic:** Apple-minimalist. Large whitespace, bold typography, clean cards. No clutter.
- **Tone:** Direct and confident (Hormozi-influenced), not American/pushy. StoryBrand arc: identify the problem → present MusicDott as guide → clear CTA.
- **Brand colors:** Navy `#1B2B6B`, Yellow `#F5B800`, Blue `#0088FF`, white background.
- **Typography:** `-apple-system, BlinkMacSystemFont, 'SF Pro Display'` — same as app.
- **Language:** Dutch (NL). Correct, natural Dutch — no calques or anglicisms.

## Page Structure

```
┌─────────────────────────────────────────┐
│  STICKY NAV                             │
│  Logo · [Inloggen] [Start gratis →]     │
├─────────────────────────────────────────┤
│  HERO                                   │
│  "Geef les. Niet administratie."        │
│  Sub + dual CTA + social proof          │
│  Teach Mode app preview panel           │
├─────────────────────────────────────────┤
│  PROBLEM (gray bg)                      │
│  3 pain point cards                     │
├─────────────────────────────────────────┤
│  STATEMENT (navy bg)                    │
│  Bold positioning statement             │
├─────────────────────────────────────────┤
│  TEACH MODE FEATURE                     │
│  Left: copy + bullets / Right: mockup   │
├─────────────────────────────────────────┤
│  CONTENT BLOCKS (gray bg)               │
│  "19 bloktypen voor élke les" — grid    │
├─────────────────────────────────────────┤
│  AUDIENCE (3 columns)                   │
│  Eigenaar / Docent (featured) / Leerling│
├─────────────────────────────────────────┤
│  TESTIMONIAL (gray bg)                  │
├─────────────────────────────────────────┤
│  PRICING (2 plans)                      │
├─────────────────────────────────────────┤
│  FOOTER CTA (navy bg, yellow button)    │
└─────────────────────────────────────────┘
```

## Components

All components live in `client/src/components/landing/`. Rewrite each in-place — no new files needed except splitting off the Teach Mode feature section.

### 1. `landing-nav.tsx` — rewrite
- Logo (`musicdott-logo.png`) left
- Right: `CompactLanguageSelector` (import from `@/components/language/language-selector`) + ghost "Inloggen" button + navy "Start gratis →" primary button
- `bg-white/95 backdrop-blur-xl border-b border-gray-200`
- Height: `h-16`
- No changes to props interface (`onLoginClick`)

### 2. `landing-hero.tsx` — rewrite
- Badge pill: navy bg, white text — "🎵 Voor muziekscholen en privédocenten"
- H1 (massive, `text-[clamp(60px,8.5vw,104px)]`, tracking-tight, navy): "Geef les." line break "Niet administratie." (second line in yellow)
- Sub: "Het enige platform dat gebouwd is rondom de les — niet de boekhouding. Voor eigenaren, docenten én leerlingen."
- CTAs: primary navy "Start gratis — 30 dagen" (→ `navigate("/signup")`) + ghost outline "Al een account? Log in →" (→ calls `onLoginClick` prop, same as the nav button — do NOT use `navigate`)
- Social proof row: 3 green-dot items
- **Teach Mode preview panel** (new, inlined in hero section):
  - Outer: navy rounded-t-2xl frame with traffic-light dots
  - Inner: white rounded-t-xl, 2-column grid (teacher left / student right)
  - Teacher side: panel header ("Teach Mode — [lesson name]" + green "● Live" badge), 4 block rows (one active/pushed), quick controls row (Timer / Metronoom / Pauze)
  - Student side: dark bg (`#0A0A1A`), YouTube player mockup, reaction buttons row
  - All purely presentational — no interactivity needed

### 3. `landing-problem.tsx` — new file (extracted from features)
- Gray bg section
- Label + H2: "Muziekles is geweldig. De rommel eromheen niet."
- 3 cards (white, border, rounded-2xl):
  1. 💬 "Lesprogramma's via WhatsApp" — scattered tools chaos
  2. 🔍 "Geen zicht op voortgang" — no insight per student
  3. 📅 "Rooster dat chaos veroorzaakt" — double bookings, missed lessons
- **Note:** No mention of billing/invoicing — MusicDott does not bill students on behalf of schools

### 4. `landing-statement.tsx` — new file
- Navy bg, white text
- H2 (large, tracking-tight): "Eén platform." + italic yellow "Gebouwd voor de docent."
- Sub paragraph in muted white

### 5. `landing-teach-mode.tsx` — new file
- Two-column layout: text left, mini app mockup right
- Label: "Unieke functie"
- H2: "Stuur je les live naar het scherm van de leerling"
- Body copy explaining real-time push
- Bullet list (5 items): video/blocks push, timer, metronoom, student reactions, pause message
- Right: smaller version of the Teach Mode mockup (same structure, ~280px tall)

### 6. `landing-blocks.tsx` — new file (replaces landing-features.tsx)
- Gray bg
- Label + H2: "19 bloktypen voor élke les"
- 4-column chip grid (desktop), 2-column (mobile):
  - YouTube, GrooveScribe, Bladmuziek, Tablature, PDF, Flat.io, ABC-notatie, Spotify, Apple Music, Tekst, Audio, Afbeeldingen, Akkoorddiagram, Songtekst, Audio→Noten, Externe link, Sync-embed, Afbeeldingsgalerij, Rich link (all 19)
- Each chip: emoji icon + title + subtitle
- **Do NOT port any content from the old `landing-features.tsx`** — that file contains disallowed billing copy ("Automatische facturering") and will be deleted

### 7. `landing-audience.tsx` — **new file** (does not exist yet)
- Label + H2: "Drie mensen. Één platform."
- 3-column grid (desktop), stacked (mobile)
- Cards: Eigenaar / Docent (featured, navy border + navy-light bg) / Leerling
- Each card: role tag, H3, sub paragraph, 7-8 check-list items
- **Eigenaar features:** dashboard, meerdere docenten, analyses, vakantieperiodes, branding, leerlingen koppelen, AVG
- **Docent features:** 19 bloktypen, Teach Mode, timer/metronoom, voortgang per leerling, opdrachten met deadlines, rooster, vraag-en-antwoord, achievements
- **Leerling features:** mijn lessen, opdrachten + deadlines, eigen rooster, achievements + badges, ranglijst, beloningswinkel, vraag de docent, oefensessies

### 8. `landing-testimonial.tsx` — minor rewrite
- Gray bg
- 5 amber stars
- Quote: "MusicDott heeft fundamenteel veranderd hoe ik lesgeef. Mijn leerlingen zijn meer betrokken dan ooit — en ik zie precies waar iedereen staat."
- Attribution: "— Stefan van de Brug · Eigenaar Drumschool · Nederland"

### 9. `landing-pricing.tsx` — minor rewrite
- Label + H2: "Kies wat bij je past"
- 2-column grid, max-w-3xl centered
- Standard (€29,95/maand): 25 leerlingen, 1 docent, onbeperkte lessen, voortgang, rapportages, rooster
- Pro (€49,95/maand, "Meest gekozen" yellow badge): 50 leerlingen, onbeperkte docenten, **Teach Mode**, geavanceerde analyses, prioriteitsondersteuning, eigen branding
- Uses `getPricingText(29.95, 49.95)` for amounts
- Note: `pricing.extraStudents` per 5 leerlingen · 30 dagen niet-goed-geld-terug · geen opstartkosten · opzeggen wanneer je wilt
- **No mention of student billing** — billing is school's MusicDott subscription only
- **Explicit Dutch copy fixes required** (current file has wrong copy):
  - Replace `"Prioriteit support"` → `"Prioriteitsondersteuning"`
  - Replace `"Custom branding opties"` → `"Eigen branding"`

### 10. `landing-footer-cta.tsx` — rewrite
- Navy bg
- H2: "Klaar om anders les te geven?" with "les te geven" in yellow
- Sub + yellow button "Start gratis — geen creditcard nodig"
- Note line + "Proudly built in The Netherlands 🇳🇱"

## `auth-page.tsx` — update imports and JSX

Remove `LandingFeatures` import and add the four new section imports. Update the JSX body to the following composition order (keep all existing state, `useEffect`, `handlePasswordChangeClose`, and `PasswordChangeDialog` unchanged):

```tsx
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

// JSX return:
return (
  <>
    <LandingNav onLoginClick={() => setLoginModalOpen(true)} />
    <LandingLoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
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
```

**Note:** `LandingLoginModal` is unchanged — keep as-is, no edits needed.

## Dutch Copy Notes

- "Geen zicht op" (not "geen inzicht in" — sounds more natural)
- "Rooster dat chaos veroorzaakt" (not "slim rooster" in problem context)
- "Prioriteitsondersteuning" (not "prioriteit support")
- "Opzeggen wanneer je wilt" (not "opzeggen wanneer u wilt")
- "Eigen branding" (not "custom branding")
- Avoid: "automatische facturering" as a feature — MusicDott does not bill students

## Files to Create/Modify

| File | Action |
|---|---|
| `client/src/components/landing/landing-nav.tsx` | Rewrite |
| `client/src/components/landing/landing-hero.tsx` | Rewrite (add Teach Mode panel) |
| `client/src/components/landing/landing-problem.tsx` | **New** |
| `client/src/components/landing/landing-statement.tsx` | **New** |
| `client/src/components/landing/landing-teach-mode.tsx` | **New** |
| `client/src/components/landing/landing-blocks.tsx` | **New** (replaces features) |
| `client/src/components/landing/landing-audience.tsx` | **New** |
| `client/src/components/landing/landing-testimonial.tsx` | Minor rewrite |
| `client/src/components/landing/landing-pricing.tsx` | Minor rewrite |
| `client/src/components/landing/landing-footer-cta.tsx` | Rewrite |
| `client/src/pages/auth-page.tsx` | Update imports + JSX composition (see section above) |
| `client/src/components/landing/landing-login-modal.tsx` | No change — keep as-is |
| `client/src/components/landing/landing-features.tsx` | **Delete** (replaced by landing-blocks) |

## Responsive Behavior

- **Desktop (≥1024px):** Full layout as described
- **Tablet (768–1023px):** Features 2-col, audience stacked, pricing stacked
- **Mobile (<768px):** Everything 1-col, hero H1 smaller, Teach Mode preview panel hidden (`hidden md:block`) on mobile, blocks 2-col

## Out of Scope

- Real-time/WebSocket in the landing page itself
- Product screenshots (can be added later once server runs in preview)
- FAQ section
- Animations beyond CSS hover states and existing transitions
- Changes to `/signup` page
- Changes to authenticated pages
