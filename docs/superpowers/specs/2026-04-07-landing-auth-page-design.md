# Landing + Auth Page Redesign

**Date:** 2026-04-07
**Status:** Approved

## Problem

The current `/auth` page uses a two-column layout: a login card on the left and a static marketing panel on the right (hidden on mobile). The full marketing content — features, pricing, FAQ, testimonials — is buried inside a dialog behind a small ghost button ("Learn More About MusicDott"). New visitors have no indication that MusicDott is a product they can buy; the page reads as a closed app for existing users.

## Goal

Transform `/auth` into a page that serves both audiences simultaneously:
- **New visitors** — see a full, scrollable marketing/sales page
- **Existing users** — find login quickly and without friction

The aesthetic must remain minimalist and essentialist (the current design's strongest quality), not a typical noisy SaaS marketing page.

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Page structure | Full scrollable landing page | Marketing content must be the first impression |
| Login trigger | Modal over the page | User stays in context; feels modern and seamless |
| Primary CTA | "Account aanmaken" → `/signup` | Drives new user conversion |
| Visual style | Minimalist / Apple-style | Preserves current brand character |
| Login shortcut | Secondary link in hero ("Al een account? Log in →") | Existing users can skip the hero without hunting |
| Mobile nav | Logo + compact icon buttons (no hamburger) | Keeps nav minimal; both actions remain one tap |

## Page Structure

```
┌─────────────────────────────────────────┐
│  STICKY NAV                             │
│  Logo          [Inloggen] [Aanmelden]   │
├─────────────────────────────────────────┤
│  HERO                                   │
│  Badge: "Voor muziekscholen"            │
│  H1: "Onderwijs dat werkt."             │
│  Subline (1–2 zinnen)                   │
│  [Start gratis] [Al een account? →]     │
│  Social proof dots (100+ scholen, etc.) │
├─────────────────────────────────────────┤
│  FEATURES (3×2 grid)                    │
│  See section 5 for exact content        │
├─────────────────────────────────────────┤
│  TESTIMONIAL (centered, italic quote)   │
├─────────────────────────────────────────┤
│  PRICING (2 plans: Standard / Pro)      │
├─────────────────────────────────────────┤
│  FOOTER CTA + "Proudly built in NL 🇳🇱" │
└─────────────────────────────────────────┘

  LOGIN MODAL (position: fixed, centered over page)
  ┌──────────────────────┐
  │  Musicdott.          │
  │  Welkom terug        │
  │  [gebruikersnaam]    │
  │  [wachtwoord]        │
  │  [inline error msg]  │
  │  [Inloggen]          │
  │  Nog geen account? → │
  └──────────────────────┘
```

## Components

### 1. Landing Page (`auth-page.tsx` — rewrite)
- Remove the two-column flex layout
- Full-width scrollable page
- State: `loginModalOpen: boolean`
- Existing `useEffect` redirect-after-login logic stays unchanged, including:
  - `user.role === 'platform_owner'` → `/owners-dashboard`
  - `user.mustChangePassword` → `setShowPasswordChange(true)`, modal closes first
  - All other roles → `/`

### 2. Sticky Navigation (`LandingNav`)
- Logo (`musicdott-logo.png`)
- `CompactLanguageSelector` (existing component, keep position)
- "Inloggen" button → sets `loginModalOpen = true`
- "Account aanmaken" button → `navigate('/signup')`
- Background: `rgba(255,255,255,0.92)` + `backdrop-filter: blur(12px)`
- Border-bottom: `1px solid #f0f0f0`
- Mobile: logo on left, both buttons remain visible as compact icon/text buttons (no hamburger)

### 3. Login Modal (`LandingLoginModal`)
- `position: fixed`, centered over viewport — opens at current scroll position regardless of how far the user has scrolled
- Uses existing `useAuth` hook and `loginMutation`
- **On login failure:** error message appears inline below the password field (reuse `FormMessage` from react-hook-form); modal stays open
- **On login success with `mustChangePassword`:** modal closes, then `PasswordChangeDialog` opens (handled by existing `useEffect` + `showPasswordChange` state — no change needed)
- **On login success (normal):** modal closes, `useEffect` handles redirect
- Overlay click closes modal
- `Escape` key closes modal — pass `onEscape={() => setLoginModalOpen(false)}` to `FocusTrap` (do NOT add a separate `useEffect` keydown listener; the component handles it)
- Focus trap: wrap modal content in `FocusTrap` (`client/src/components/accessibility/focus-trap.tsx`); focus moves to first input on open (`isActive` prop), Tab cycles within modal, focus returns to trigger on close
- "Nog geen account?" link → `navigate('/signup')`, closes modal

### 4. Hero Section (`LandingHero`)
- Badge pill: "🎵 Voor muziekscholen en privédocenten"
- H1: "Onderwijs dat werkt. Beheer dat verdwijnt."
- Sub: "MusicDott stroomlijnt je muziekschool zodat jij je kunt richten op wat echt telt: muziek maken met je leerlingen."
- Primary CTA: "Start gratis — 30 dagen" → `navigate('/signup')`
- Secondary CTA: "Al een account? Log in →" → sets `loginModalOpen = true` (modal is fixed-position, opens in place)
- Social proof row: three green-dot items — "100+ muziekscholen", "Gebouwd door docenten", "AVG-compliant"

### 5. Features Grid (`LandingFeatures`)
- Label: "Alles in één platform" (uppercase, blue)
- H2: "Alles wat je nodig hebt"
- Sub: "Geen losse tools meer. MusicDott combineert alles in één rustige omgeving."
- 3×2 grid (desktop), 1-column (mobile)
- Cards:

| Icon | Title | Description |
|---|---|---|
| `Users` | Leerlingbeheer | Overzicht van voortgang, opdrachten en prestaties per leerling. |
| `Music` | Interactieve lessen | Maak multimedia-lessen met bladmuziek, audio en video. |
| `Trophy` | Achievement systeem | Badges en mijlpalen houden leerlingen gemotiveerd. |
| `Calendar` | Slim rooster | Visuele agenda met conflictdetectie en automatische herinneringen. |
| `CreditCard` | Automatische facturering | Abonnementsbeheer dat meegroeit met je leerlingaantal. |
| `BarChart` | Analyses & inzichten | Begrijp groei, prestaties en kansen in één dashboard. |

Use Lucide React icons (already imported in the project).

### 6. Testimonial (`LandingTestimonial`)
- 5 amber stars
- Quote: *"MusicDott heeft veranderd hoe we onze muziekschool runnen. De leerlingbetrokkenheid is ongelooflijk."*
- Attribution: — Stefan van de Brug, Drumschool eigenaar, Nederland

### 7. Pricing (`LandingPricing`)
- H2: "Eerlijke prijzen"
- Sub: "Kies het plan dat past bij jouw school. Eenvoudig opschalen als je groeit."
- Uses `getPricingText()` for amounts
- 2-column grid (desktop), stacked (mobile)

**Standard plan** (`pricing.standard`/month):
- Tot 25 leerlingen
- 1 docentaccount
- Onbeperkte lessen & content
- Voortgangsregistratie leerlingen
- Basisrapportages & analyses
- CTA: "Kies Standard" → `navigate('/signup')`

**Pro plan** (`pricing.pro`/month, "Meest gekozen" badge):
- Tot 50 leerlingen
- Onbeperkte docentaccounts
- Geavanceerde analyses & inzichten
- Prioriteit support
- Custom branding opties
- CTA: "Kies Pro" → `navigate('/signup')`

Below grid: `pricing.extraStudents` per 5 leerlingen/maand · 30 dagen niet-goed-geld-terug · Geen opstartkosten · Opzeggen wanneer je wilt

### 8. Footer CTA (`LandingFooterCta`)
- H2: "Klaar om te beginnen?"
- Sub: "Sluit je aan bij honderden muziekdocenten die MusicDott al gebruiken."
- CTA: "Start gratis — geen creditcard nodig" → `navigate('/signup')`
- Note: "30 dagen gratis · Volledige toegang · Opzeggen wanneer je wilt"
- "Proudly built in The Netherlands 🇳🇱"

## Existing Code Reuse

| Existing | Reuse |
|---|---|
| `useAuth` hook | Unchanged — used in login modal |
| `loginMutation` | Unchanged |
| `PasswordChangeDialog` | Unchanged — triggered by existing `useEffect` after modal closes |
| `CompactLanguageSelector` | Moved into sticky nav |
| `getPricingText()` | Used in pricing section |
| `focus-trap.tsx` | Used for modal focus trap |
| `learn-more-dialog.tsx` | **Delete** — confirmed unused (no imports anywhere in codebase) |

## Routing

No route changes needed. `/auth` remains the entry point. The `useEffect` redirect-after-login logic (including `platform_owner` → `/owners-dashboard`) stays unchanged.

## Responsive Behavior

- **Desktop (≥1024px):** Full layout as designed; features 3×2 grid; pricing 2-column
- **Mobile (<1024px):**
  - Nav: logo left, both buttons remain visible as compact text buttons
  - Features grid: 1 column
  - Pricing grid: 1 column stacked
  - Modal: full-width with `mx-4` padding, `max-h-[90vh] overflow-y-auto`

## Out of Scope

- New backend routes
- Changes to `/signup` page
- Changes to authenticated pages
- FAQ section (can be added later)
- Animation/transitions beyond CSS hover states
- Multi-location support section (already in learn-more-dialog but excluded for simplicity)
