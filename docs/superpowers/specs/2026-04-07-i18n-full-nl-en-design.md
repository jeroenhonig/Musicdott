# Design: Volledige NL/EN Taalondersteuning

**Datum:** 2026-04-07
**Status:** Goedgekeurd

## Probleemstelling

Het Musicdott platform heeft al een gedeeltelijke i18n-infrastructuur (`i18n.ts`, `LanguageProvider`, `LanguageSelector`), maar:
- De vlagschakelaar is niet zichtbaar bovenin de app-interface
- Tientallen pagina's/componenten bevatten nog hardgecodeerde tekst
- Docent-opmerkingen (dynamische content) worden niet automatisch vertaald

## Scope

1. Vlagschakelaar zichtbaar bovenin (sidebar + mobile header)
2. 100% vertaalbare UI-tekst (alle hardgecodeerde strings vervangen)
3. Auto-vertaling van dynamische docent-content via DeepL API

---

## 1. Vlagschakelaar plaatsing

### Sidebar (desktop)
- Voeg `CompactLanguageSelector` (uit `language-selector.tsx`) toe aan het bovenste gedeelte van `sidebar.tsx`, naast het Musicdott-logo
- `CompactLanguageSelector` toont vlaggen (🇳🇱 / 🇬🇧) — de `toggle` variant toont géén vlaggen en is dus niet geschikt
- De `toggle` variant van `LanguageSelector` moet worden bijgewerkt om ook vlaggen te tonen, zodat die bruikbaar is op andere plekken

### Mobile header
- Voeg `CompactLanguageSelector` toe aan `mobile-header.tsx` in de rechter icon-groep, naast de avatar
- Al aanwezig op de landingspagina via `landing-nav.tsx`

### Opslag
- Blijft `localStorage` met sleutel `musicdott-language` (huidige implementatie)
- `getStoredLanguage()` / `setStoredLanguage()` in `i18n.ts` zijn al correct

---

## 2. Volledige UI-vertaalbaarheid

### Aanpak
Systematische audit van alle `.tsx`-bestanden op hardgecodeerde strings. Per bestand:
1. Identificeer hardgecodeerde UI-tekst (grep op JSX string literals en aria-labels)
2. Voeg ontbrekende sleutels toe aan `i18n.ts` (EN + NL)
3. Vervang hardgecodeerde tekst door `t('key')` via `useTranslation()`

Audit-aanpak: grep op `className=` + omliggende tekst-nodes, plus `aria-label="` om alle hardgecodeerde accessibility strings mee te nemen.

### Bestanden met prioriteit (hardgecodeerde tekst bevestigd)
- `components/layouts/mobile-header.tsx` — aria-labels, "MusicDott" app naam
- `components/layouts/sidebar.tsx` — nav labels, logout tekst, en ~10+ extra hardgecodeerde strings: "Mijn Agenda", "Analytics & Reports", "Import Data", "Learning Hub", "School Management", "Teachers", "Manage Members", "Billing & Plans", "School Settings", etc.
- `pages/auth-page.tsx` — loginformulier tekst
- `pages/dashboard.tsx` — dashboardtekst
- `pages/lessons/index.tsx` — lessen overzicht
- `pages/students/index.tsx` — studentenoverzicht
- `components/admin/lesson-progress-tracker.tsx` — "Teacher Notes", sectiebeschrijvingen
- `components/import/pos-csv-import.tsx` — "Opmerkingen" label (display-only, geen DeepL nodig)
- Alle overige `.tsx`-bestanden die nog geen `useTranslation` importeren

### Uitbreiding `i18n.ts`
Nieuwe vertaalsleutels toevoegen voor alle nieuwe strings, georganiseerd per namespace (bv. `lessons.*`, `students.*`, `admin.*`).

---

## 3. DeepL Auto-vertaling voor dynamische content

### Welke content
- `teacherNotes` (veld in de lessons/progress DB-tabel) — opmerkingen die een docent bij een les schrijft
- `posOpmerkingen` — display-only data uit POS-import (alleen client-side vertalen bij rendering, niet opslaan in DB)

### Server: `/api/translate`

```
POST /api/translate
Body: { text: string, targetLang: 'EN' | 'NL' }
Response: { translatedText: string }
```

- Vereist authenticatie (`requireAuth` middleware) — de route is niet publiek toegankelijk
- Roept DeepL Free API aan: `https://api-free.deepl.com/v2/translate`
- `source_lang` wordt **niet** meegegeven: DeepL detecteert de brontaal automatisch (betrouwbaarder dan eigen heuristiek)
- Vereist: `DEEPL_API_KEY` environment variabele (ook toevoegen aan `.env.example` met placeholder)
- **Server-side cache**: `Map<string, string>` met sleutel `` `${targetLang}:${text}` `` (raw tekst als sleutel, geen hash nodig voor een in-memory Map) — **bekende beperking**: geen eviction/TTL, acceptabel voor MVP
- Foutafhandeling: bij DeepL-fout (incl. 429 quota overschreden) → originele tekst retourneren (graceful fallback)
- DeepL Free tier limiet: 500.000 tekens/maand — bij overschrijding valt de UI terug op originele tekst zonder foutmelding voor de gebruiker

### Frontend: auto-vertaling tonen

In componenten die `teacherNotes` / `posOpmerkingen` tonen:
1. Detecteer actieve taal via `useTranslation().language`
2. Skip vertaling als `text` leeg of null is
3. Stuur `POST /api/translate` bij renderen van de content
4. Gebruik `AbortController` om in-flight requests te annuleren bij taalwisseling of unmount (voorkomt race condition)
5. Toon vertaalde tekst met subtiel "Vertaald / Translated" label (met `title` attribuut voor screen readers)

Betrokken componenten:
- `components/admin/lesson-progress-tracker.tsx` — rendert `teacherNotes`
- `components/import/pos-csv-import.tsx` — rendert `posOpmerkingen` (1600+ regels, geen bestaande i18n-imports — niet-triviaal werk, scope beperkt tot alleen het `posOpmerkingen`-blok)
- Andere componenten die `teacherNotes` tonen (audit bevestigt welke dit zijn)

*Opmerking: `lesson-play.tsx` bevat geen `teacherNotes` — dit was een incorrecte aanname in de eerste versie van de spec.*

---

## Architectuur & Dataflow

```
Gebruiker klikt vlag
    → setLanguage('nl'|'en')
    → localStorage bijgewerkt
    → React context herrendert alle t() calls
    → Dynamische content: POST /api/translate aangeroepen (met AbortController)
    → requireAuth → DeepL API (server-side, gecached)
    → Vertaalde tekst getoond met "Vertaald" label
    → Bij fout/quota: originele tekst getoond (stille fallback)
```

---

## Bekende beperkingen (MVP)

- Server-side vertaalcache heeft geen size-limit of TTL (acceptable voor MVP, later te vervangen door LRU-cache)
- Eerste pageload toont kort Engels voor NL-gebruikers (localStorage is niet beschikbaar vóór hydration) — bekende beperking van de huidige architectuur
- DeepL Free tier: 500k tekens/maand, geen ingebouwde quota-monitoring

---

## Niet in scope

- RTL-taalondersteuning
- Meer dan 2 talen
- Vertaling van uploaded bestanden (PDF, afbeeldingen)
- Quota-monitoring dashboard voor DeepL-gebruik

---

## Implementatievolgorde

1. `CompactLanguageSelector` plaatsen in sidebar en mobile header; `toggle`-variant bijwerken met vlaggen
2. `DEEPL_API_KEY` toevoegen aan `.env.example`
3. DeepL server-route aanmaken (`POST /api/translate` met `requireAuth` en server-side cache)
4. `i18n.ts` uitbreiden met ontbrekende sleutels (systematische audit)
5. Hardgecodeerde tekst vervangen in alle componenten/pagina's
6. Auto-vertaling integreren in `lesson-progress-tracker.tsx` en andere componenten met `teacherNotes`
