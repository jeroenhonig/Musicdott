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
- Voeg `LanguageSelector` toe aan het bovenste gedeelte van `sidebar.tsx`, naast het Musicdott-logo
- Variant: `toggle` (compact, toont 🇳🇱 / 🇬🇧)

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
1. Identificeer hardgecodeerde UI-tekst
2. Voeg ontbrekende sleutels toe aan `i18n.ts` (EN + NL)
3. Vervang hardgecodeerde tekst door `t('key')` via `useTranslation()`

### Bestanden met prioriteit (hardgecodeerde tekst bevestigd)
- `components/layouts/mobile-header.tsx` — "Toggle navigation menu", "MusicDott"
- `components/layouts/sidebar.tsx` — nav labels, logout tekst
- `pages/auth-page.tsx` — loginformulier tekst
- `pages/dashboard.tsx` — dashboardtekst
- `pages/lessons/index.tsx` — lessen overzicht
- `pages/students/index.tsx` — studentenoverzicht
- `components/admin/lesson-progress-tracker.tsx` — "Teacher Notes", sectiebeschrijvingen
- `components/import/pos-csv-import.tsx` — "Opmerkingen" label
- Alle overige `.tsx`-bestanden die nog geen `useTranslation` importeren

### Uitbreiding `i18n.ts`
Nieuwe vertaalsleutels toevoegen voor alle nieuwe strings, georganiseerd per namespace (bv. `lessons.*`, `students.*`, `admin.*`).

---

## 3. DeepL Auto-vertaling voor dynamische content

### Welke content
- `teacherNotes` (veld in de lessons/progress DB-tabel) — opmerkingen die een docent bij een les schrijft
- `posOpmerkingen` — bestaande notatiedata uit POS-import

### Server: `/api/translate`

```
POST /api/translate
Body: { text: string, targetLang: 'EN' | 'NL' }
Response: { translatedText: string }
```

- Roept DeepL Free API aan: `https://api-free.deepl.com/v2/translate`
- Vereist: `DEEPL_API_KEY` environment variabele
- **Server-side cache**: `Map<string, string>` met sleutel `${targetLang}:${hash(text)}` om herhaalde API-calls te voorkomen
- Foutafhandeling: bij DeepL-fout wordt originele tekst geretourneerd (graceful fallback)

### Frontend: auto-vertaling tonen

In componenten die `teacherNotes` / `posOpmerkingen` tonen:
1. Detecteer actieve taal via `useTranslation().language`
2. Bij laden van de content: stuur `POST /api/translate` als taal ≠ vermoedelijke brontaal
3. Toon vertaalde tekst met subtiel "vertaald" label
4. Brontaal-detectie: simpel heuristisch (als platform-taal = NL en content bevat NL woorden → niet vertalen)

Betrokken componenten:
- `components/admin/lesson-progress-tracker.tsx`
- `components/lessons/lesson-play.tsx` (als teacherNotes daarin getoond wordt)
- Andere componenten die `teacherNotes` renderen

---

## Architectuur & Dataflow

```
Gebruiker klikt vlag
    → setLanguage('nl'|'en')
    → localStorage bijgewerkt
    → React context herrendert alle t() calls
    → Dynamische content: POST /api/translate aangeroepen
    → DeepL API (server-side, gecached)
    → Vertaalde tekst getoond
```

---

## Niet in scope

- RTL-taalondersteuning
- Meer dan 2 talen
- Vertaling van uploaded bestanden (PDF, afbeeldingen)
- Automatische detectie van taal van docent-opmerkingen (te complex, out of scope)

---

## Implementatievolgorde

1. Vlagschakelaar plaatsen (sidebar + mobile header)
2. DeepL server-route aanmaken
3. `i18n.ts` uitbreiden met ontbrekende sleutels
4. Hardgecodeerde tekst vervangen in alle componenten/pagina's
5. Auto-vertaling integreren in componenten die teacherNotes tonen
