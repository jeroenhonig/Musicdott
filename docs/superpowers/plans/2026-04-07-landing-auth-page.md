# Landing + Auth Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-column login card at `/auth` with a full scrollable landing/marketing page that has a sticky nav + login modal, while keeping all existing auth logic intact.

**Architecture:** `auth-page.tsx` is rewritten as a composition of focused landing section components (`LandingNav`, `LandingLoginModal`, `LandingHero`, etc.) living in `client/src/components/landing/`. The login modal wraps the existing `loginMutation` and `FocusTrap`. No backend changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React icons, Wouter (routing), existing `useAuth` hook, `FocusTrap` component, `getPricingText()`, `CompactLanguageSelector`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `client/src/components/landing/landing-nav.tsx` | Sticky nav: logo, language selector, login + signup buttons |
| Create | `client/src/components/landing/landing-login-modal.tsx` | Login modal: form, error state, focus trap, escape key |
| Create | `client/src/components/landing/landing-hero.tsx` | Hero section: tagline, CTAs, social proof |
| Create | `client/src/components/landing/landing-features.tsx` | 3×2 features grid |
| Create | `client/src/components/landing/landing-testimonial.tsx` | Single testimonial with stars |
| Create | `client/src/components/landing/landing-pricing.tsx` | Two pricing plans |
| Create | `client/src/components/landing/landing-footer-cta.tsx` | Final CTA + footer |
| Rewrite | `client/src/pages/auth-page.tsx` | Compose all sections, own `loginModalOpen` state |
| Delete | `client/src/components/marketing/learn-more-dialog.tsx` | Unused — confirmed no imports |

---

## Chunk 1: Landing Section Components

### Task 1: `LandingNav`

**Files:**
- Create: `client/src/components/landing/landing-nav.tsx`

- [ ] **Step 1: Create the file**

```tsx
// client/src/components/landing/landing-nav.tsx
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
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-12 h-14 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <img src={musicdottLogo} alt="Musicdott" className="h-8 w-auto" />
      <div className="flex items-center gap-2">
        <CompactLanguageSelector />
        <Button variant="ghost" size="sm" onClick={onLoginClick}>
          Inloggen
        </Button>
        <Button size="sm" onClick={() => navigate("/signup")}>
          Account aanmaken
        </Button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run check 2>&1 | grep -A2 "landing-nav"
```

Expected: no errors mentioning `landing-nav.tsx`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-nav.tsx
git commit -m "feat: add LandingNav component"
```

---

### Task 2: `LandingLoginModal`

**Files:**
- Create: `client/src/components/landing/landing-login-modal.tsx`

- [ ] **Step 1: Create the file**

```tsx
// client/src/components/landing/landing-login-modal.tsx
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import FocusTrap from "@/components/accessibility/focus-trap";
import { useAuth } from "@/hooks/use-auth";
import { loginCredentialsSchema } from "@shared/auth-validation";

interface LandingLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LandingLoginModal({ isOpen, onClose }: LandingLoginModalProps) {
  const { loginMutation } = useAuth();
  const [, navigate] = useLocation();

  const form = useForm<z.infer<typeof loginCredentialsSchema>>({
    resolver: zodResolver(loginCredentialsSchema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof loginCredentialsSchema>) {
    loginMutation.mutate(
      { username: values.username, password: values.password },
      { onSuccess: onClose }
    );
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <FocusTrap isActive={isOpen} onEscape={onClose}>
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center mb-6">
            <p className="text-xl font-bold tracking-tight">
              Music<span className="text-primary">dott.</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">Welkom terug</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gebruikersnaam</FormLabel>
                    <FormControl>
                      <Input placeholder="gebruikersnaam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wachtwoord</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {loginMutation.isError && (
                // Note: useAuth's loginMutation also fires a toast on error (existing behavior).
                // The inline message gives persistent feedback inside the modal; the toast is transient. Both are acceptable.
                <p className="text-sm text-red-600">
                  Gebruikersnaam of wachtwoord onjuist.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Inloggen
              </Button>
            </form>
          </Form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Nog geen account?{" "}
            <button
              onClick={() => { onClose(); navigate("/signup"); }}
              className="text-primary hover:underline font-medium"
            >
              Aanmelden
            </button>
          </p>
        </div>
      </FocusTrap>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run check 2>&1 | grep -A2 "landing-login-modal"
```

Expected: no errors mentioning `landing-login-modal.tsx`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-login-modal.tsx
git commit -m "feat: add LandingLoginModal component"
```

---

### Task 3: `LandingHero`

**Files:**
- Create: `client/src/components/landing/landing-hero.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npm run check 2>&1 | grep -A2 "landing-hero"
```

Expected: no errors mentioning `landing-hero.tsx`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-hero.tsx
git commit -m "feat: add LandingHero component"
```

---

### Task 4: `LandingFeatures`

**Files:**
- Create: `client/src/components/landing/landing-features.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npm run check 2>&1 | grep -A2 "landing-features"
```

Expected: no errors mentioning `landing-features.tsx`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-features.tsx
git commit -m "feat: add LandingFeatures component"
```

---

### Task 5: `LandingTestimonial`

**Files:**
- Create: `client/src/components/landing/landing-testimonial.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npm run check 2>&1 | grep -A2 "landing-testimonial"
```

Expected: no errors mentioning `landing-testimonial.tsx`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-testimonial.tsx
git commit -m "feat: add LandingTestimonial component"
```

---

### Task 6: `LandingPricing`

**Files:**
- Create: `client/src/components/landing/landing-pricing.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npm run check 2>&1 | grep -A2 "landing-pricing"
```

Expected: no errors mentioning `landing-pricing.tsx`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-pricing.tsx
git commit -m "feat: add LandingPricing component"
```

---

### Task 7: `LandingFooterCta`

**Files:**
- Create: `client/src/components/landing/landing-footer-cta.tsx`

- [ ] **Step 1: Create the file**

```tsx
// client/src/components/landing/landing-footer-cta.tsx
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function LandingFooterCta() {
  const [, navigate] = useLocation();

  return (
    <section className="py-20 px-6 text-center border-t border-gray-100">
      <h2 className="text-3xl font-bold tracking-tight mb-3">Klaar om te beginnen?</h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Sluit je aan bij honderden muziekdocenten die MusicDott al gebruiken.
      </p>
      <Button size="lg" onClick={() => navigate("/signup")}>
        Start gratis — geen creditcard nodig
      </Button>
      <p className="mt-4 text-xs text-gray-400">
        30 dagen gratis · Volledige toegang · Opzeggen wanneer je wilt
      </p>
      <p className="mt-8 text-xs text-gray-300">Proudly built in The Netherlands 🇳🇱</p>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run check 2>&1 | grep -A2 "landing-footer"
```

Expected: no errors mentioning `landing-footer-cta.tsx`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/landing/landing-footer-cta.tsx
git commit -m "feat: add LandingFooterCta component"
```

---

## Chunk 2: Auth Page Rewrite + Cleanup

### Task 8: Rewrite `auth-page.tsx`

**Files:**
- Modify: `client/src/pages/auth-page.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
// client/src/pages/auth-page.tsx
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { PasswordChangeDialog } from "@/components/password-change-dialog";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingLoginModal } from "@/components/landing/landing-login-modal";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
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
        <hr className="border-gray-100 mx-6" />
        <LandingFeatures />
        <hr className="border-gray-100 mx-6" />
        <LandingTestimonial />
        <hr className="border-gray-100 mx-6" />
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

- [ ] **Step 2: Type-check the whole project**

```bash
npm run check 2>&1 | head -40
```

Expected: no TypeScript errors

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3001/auth` and verify:

**Desktop (full width):**
- Sticky nav: logo, language selector, "Inloggen" and "Account aanmaken" buttons visible
- Hero: headline, two CTA buttons, three social proof dots
- Features grid: 6 cards in 3 columns
- Testimonial: centered quote with stars
- Pricing: 2 plans side-by-side, "Meest gekozen" badge on Pro
- Footer CTA: large button + footer text

**Modal interaction:**
- Click "Inloggen" in nav → modal appears over page (page not scrolled away)
- Click "Al een account?" in hero → same modal appears
- Click overlay → modal closes
- Press Escape → modal closes
- Login with wrong credentials → inline red error below password, modal stays open, toast also appears (expected)
- Login with valid credentials (normal user) → modal closes, redirects to `/`
- Login with valid credentials (platform_owner role) → modal closes, redirects to `/owners-dashboard`
- Login with `mustChangePassword = true` → modal closes, `PasswordChangeDialog` opens

**Mobile (resize to 375px wide):**
- Nav: logo and both buttons still visible without hamburger
- Features grid: single column
- Pricing: plans stacked vertically
- Modal: full width with side padding, scrollable if keyboard pushes content up

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/auth-page.tsx
git commit -m "feat: rewrite auth-page as landing page with login modal"
```

---

### Task 9: Delete unused `learn-more-dialog.tsx`

**Files:**
- Delete: `client/src/components/marketing/learn-more-dialog.tsx`

- [ ] **Step 1: Confirm no imports exist**

```bash
grep -r "learn-more-dialog\|LearnMoreDialog" client/src/
```

Expected: no output (file is not imported anywhere)

- [ ] **Step 2: Delete the file**

```bash
rm client/src/components/marketing/learn-more-dialog.tsx
```

- [ ] **Step 3: Type-check to confirm nothing broke**

```bash
npm run check 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Run unit tests to confirm nothing regressed**

```bash
npm run test:unit 2>&1 | tail -10
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git rm client/src/components/marketing/learn-more-dialog.tsx
git commit -m "chore: delete unused learn-more-dialog.tsx"
```
