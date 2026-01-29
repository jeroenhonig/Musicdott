# MusicDott 2.0 - Code Quality Audit & Bug Fix Report

**Datum:** 27 januari 2026
**Status:** Audit compleet, kritieke bugs gefixt

---

## Overzicht

Dit rapport bevat de resultaten van een uitgebreide code quality audit van de MusicDott 2.0 codebase. De audit omvatte server code, client code, shared schema's, middleware, services, en configuratie bestanden.

**Codebase omvang:**
- 221 client TypeScript/TSX bestanden
- 65+ server TypeScript bestanden
- 30+ database tabellen
- 123 npm dependencies

---

## Bugs Gevonden & Gefixt

### KRITIEK (runtime crashes / data corruptie)

| # | Bug | Bestand | Fix |
|---|-----|---------|-----|
| 1 | **Dubbele HTTP server** - `routes.ts` maakte een eigen `createServer()` aan naast `index.ts`. Vite HMR was gekoppeld aan de verkeerde server die nooit luisterde, waardoor hot reload niet werkte. | `server/index.ts`, `server/routes.ts` | `routes.ts` maakt geen server meer aan. Vite krijgt nu de juiste `httpServer`. |
| 2 | **11 ontbrekende StorageWrapper methodes** - `getUnreadMessageCount`, `getStudentPracticeVideos`, `createPracticeVideo`, `updatePracticeVideo`, `deletePracticeVideo`, `getVideoComments`, `createVideoComment`, `updateVideoComment`, `deleteVideoComment`, `getStudentsWithBirthdayToday`, `getSchoolTeachers` waren niet gedelegeerd. | `server/storage-wrapper.ts` | Alle 11 methodes toegevoegd als delegaties. |
| 3 | **`getStudentByUserId` bestond niet** - `RealtimeBus` riep `this.storage.getStudentByUserId()` aan, maar die methode bestaat niet in de IStorage interface. Elke student WebSocket verbinding crashte. | `server/services/realtime-bus.ts` | Vervangen door `this.storage.getStudents(userId)` die al bestaat. |
| 4 | **Username map corruptie** - `updateCurrentUserProfile` gebruikte `email` als key voor de `usersByUsername` map in plaats van `username`. Na een profile update was de user niet meer vindbaar. | `server/storage.ts:1721` | Gecorrigeerd naar `username` als key voor delete en set operaties. |
| 5 | **Route files omzeilden security wrapper** - `ical.ts` en `recurring-schedules.ts` importeerden `storage` direct uit `../storage` i.p.v. `../storage-wrapper`, waardoor real-time event broadcasting en school-scoped security werd omzeild. | `server/routes/ical.ts`, `server/routes/recurring-schedules.ts` | Import gewijzigd naar `../storage-wrapper`. |
| 6 | **deleteMessage broadcast werkte nooit** - `deleteMessage` retourneert `void` maar de wrapper checkte `if (result && messageData)`, waardoor `result` altijd `undefined` was. | `server/storage-wrapper.ts` | Check gewijzigd naar `if (messageData)`. |
| 7 | **Count queries gaven boolean terug i.p.v. nummer** - `getDatabaseStatus()` gebruikte `eq(users.id, users.id)` als count expressie, wat `true` retourneert per rij. | `server/setup-db.ts:777-780` | Vervangen door ``sql`count(*)```` met `Number()` conversie. |
| 8 | **3 junction tables zonder primary key** - `userBadges`, `assignmentTargets`, `classEnrollments` hadden geen primary key. | `shared/schema.ts` | Serial `id` primary key toegevoegd aan alle drie. |

### HOOG (security / development workflow)

| # | Bug | Bestand | Fix |
|---|-----|---------|-----|
| 9 | **notFoundHandler blokkeerde SPA routing** - Was gemount op alle routes, waardoor client-side routes een 404 JSON response kregen i.p.v. index.html. | `server/index.ts`, `server/middleware/error-handler.ts` | Gemount op alleen `/api` path. Gebruikt nu `req.originalUrl`. |
| 10 | **Hardcoded admin wachtwoord 'admin123'** - Als `ADMIN_PASSWORD` niet gezet was, kreeg de admin een triviaal wachtwoord. | `server/setup-db.ts:498` | Genereert nu een cryptographisch random wachtwoord en logt een waarschuwing. |
| 11 | **Environment validatie op ELKE request** - `validateEnvironment` middleware checkte `SESSION_SECRET` op elk HTTP request, wat onnodig overhead gaf. | `server/middleware/security.ts` | Eenmalige check bij first-use, resultaat wordt gecached. |
| 12 | **Poort hardcoded op 5000** - Geen `PORT` env variable support, `reusePort` kon op macOS crashen. | `server/index.ts:186` | Gebruikt nu `process.env.PORT` met fallback naar 5000. `reusePort` verwijderd. |
| 13 | **nanoid niet in dependencies** - `vite.ts` importeerde `nanoid` maar het stond niet in `package.json`. Cache-busting was ook onnodig (Vite handelt dit zelf af). | `server/vite.ts` | Import en cache-busting logica verwijderd. |
| 14 | **Permissions-Policy blokkeerde Stripe** - `payment=()` disabled de Payment Request API, maar MusicDott gebruikt Stripe. | `server/middleware/security.ts` | `payment=()` verwijderd uit Permissions-Policy. |

---

## Documentatie Reorganisatie

Alle documentatie bestanden zijn verplaatst naar `docs/`:

| Oud | Nieuw |
|-----|-------|
| `DEPLOYMENT.md` | `docs/DEPLOYMENT.md` |
| `DEBIAN_INSTALL.md` | `docs/DEBIAN_INSTALL.md` |
| `DATABASE_FIXES_SUMMARY.md` | `docs/DATABASE_FIXES_SUMMARY.md` |
| `server/middleware/authz-integration-examples.md` | `docs/authz-integration-examples.md` |

Links in `README.md` zijn bijgewerkt naar de nieuwe locaties.

---

## Bekende Issues (Niet Gefixt - Lager Risico)

### Schema Issues

1. **V1 vs V2 ID type mismatch** - V1 tabellen gebruiken `serial` (integer) IDs, V2 tabellen (gamification, assignments_v2, etc.) gebruiken `uuid` IDs. Deze tabellen kunnen niet met elkaar joinen zonder type casting. De V2 tabellen lijken nog niet in productie gebruik te zijn.

2. **30+ kolommen missen foreign key references** - Veel `schoolId`, `userId`, `studentId` kolommen hebben geen `.references()` constraint. Dit staat orphaned records toe. De database-level integriteit is hierdoor zwak, maar het ORM layer compenseert dit deels.

3. **Geen Drizzle `relations()` gedefinieerd** - Relational queries via `db.query.users.findMany({ with: { students: true } })` werken niet. De code gebruikt handmatige joins.

4. **Geen database indexes** - Er zijn geen expliciete indexes gedefinieerd op veelgebruikte kolommen (schoolId, userId, etc.). Dit heeft performance impact bij grotere datasets.

5. **Inconsistente `onDelete` cascade** - Sommige foreign keys hebben cascade delete, andere niet. Dit kan tot orphaned data leiden.

6. **UUID tabellen zonder `defaultRandom()`** - 8 AI-feature tabellen (`lessonRecaps`, `mediaTranscripts`, etc.) vereisen handmatig UUID bij insert.

7. **Redundante `bpm`/`tempo` kolommen** in songs tabel (integer vs text).

### Server Issues

8. **Dual password hashing** - Bestaande passwords gebruiken bcrypt, nieuwe passwords gebruiken scrypt. De `comparePasswords` functie handelt beide af, maar het is verwarrend.

9. **WebSocket authenticatie via query params** - `websocket.ts` (ongebruikt, vervangen door RealtimeBus) authenticated via URL parameters zonder session validatie.

10. **Storage switching interval** - `StorageWrapper` checkt elke 5 seconden of de database beschikbaar is en switcht dan live van storage backend. In-flight operaties kunnen verloren gaan.

11. **`schoolMemberships` tabel mist unieke constraint** - `onConflictDoNothing()` wordt aangeroepen maar er is geen `UNIQUE(school_id, user_id)` constraint.

12. **Verbose auth logging** - Login attempts loggen usernames en password match results in production.

### Client Issues (Niet verifi&euml;erbaar zonder Node.js)

13. **Client review was beperkt** - Door rate limiting kon de client-side code niet volledig gereviewed worden. Aanbeveling: voer een aparte client-side audit uit.

---

## Kwaliteitsscore

| Categorie | Score | Toelichting |
|-----------|-------|-------------|
| **Architectuur** | 7/10 | Goede scheiding van concerns (client/server/shared). Multi-tenant model is degelijk. StorageWrapper pattern is slim maar complex. |
| **Code Consistentie** | 5/10 | Mix van V1 en V2 schema's, dual password hashing, inconsistente naming patterns, sommige dead code (websocket.ts). |
| **Security** | 7/10 | OWASP compliance, Helmet.js, rate limiting, input sanitization. Minpunten: verbose logging, ontbrekende rate limit op /api/register, hardcoded invite codes. |
| **Database Integriteit** | 4/10 | Veel ontbrekende foreign keys, geen indexes, inconsistente cascades, junction tables misten primary keys (nu gefixt). |
| **Error Handling** | 6/10 | Centraal error handling framework aanwezig. Sommige routes missen try/catch. Graceful shutdown is goed geimplementeerd. |
| **Type Safety** | 6/10 | TypeScript strict mode aan. Veel `any` types in storage interfaces en route handlers. Zod validation op schema level. |
| **Testbaarheid** | 3/10 | Test framework (Vitest) geconfigureerd maar minimale test coverage. Geen unit tests voor services of storage layer. |
| **Development Experience** | 6/10 | Vite HMR (nu gefixt), Docker setup voor production. Goede README en deployment docs. .env.example aanwezig. |

**Totaalscore: 5.5/10**

---

## Aanbevelingen (Prioriteit)

### P0 - Onmiddellijk
- [x] ~~Alle kritieke bugs fixen (gedaan in deze audit)~~
- [ ] Rate limiting toevoegen op `/api/register` endpoint
- [ ] Hardcoded invite codes (`DEMO123`, `STUDENT123`) vervangen door configureerbare waarden

### P1 - Kort termijn
- [ ] Database indexes toevoegen op `schoolId`, `userId`, `studentId` kolommen
- [ ] Foreign key references toevoegen op alle kolommen die naar andere tabellen verwijzen
- [ ] `UNIQUE(school_id, user_id)` constraint toevoegen op `schoolMemberships`
- [ ] `any` types vervangen door concrete types in storage interface methodes
- [ ] Verbose auth logging verwijderen of achter een debug flag zetten

### P2 - Middellang termijn
- [ ] Unit tests schrijven voor storage layer, services, en middleware
- [ ] V1/V2 schema mismatch oplossen (migreer naar consistent ID type)
- [ ] Drizzle `relations()` definieren voor ergonomische queries
- [ ] Dead code verwijderen (`websocket.ts`, ongebruikte imports)
- [ ] Storage switching interval vervangen door een robuuster reconnect mechanisme

### P3 - Lang termijn
- [ ] `defaultRandom()` toevoegen aan alle UUID primary key kolommen
- [ ] Client-side code audit uitvoeren
- [ ] E2E test suite opzetten met Playwright
- [ ] Performance monitoring integreren (query timings, response times)

---

## Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `server/index.ts` | Vite nu gekoppeld aan juiste httpServer; PORT env var; notFoundHandler scope; reusePort verwijderd |
| `server/routes.ts` | Geen eigen HTTP server meer; return type naar void |
| `server/storage.ts` | Username map corruption fix |
| `server/storage-wrapper.ts` | 11 ontbrekende delegations; deleteMessage broadcast fix |
| `server/routes/ical.ts` | Storage import fix |
| `server/routes/recurring-schedules.ts` | Storage import fix |
| `server/services/realtime-bus.ts` | getStudentByUserId vervangen door getStudents |
| `server/middleware/security.ts` | Environment validatie gecached; Permissions-Policy fix |
| `server/middleware/error-handler.ts` | notFoundHandler scope + originalUrl |
| `server/setup-db.ts` | Count queries fix; admin password security |
| `server/vite.ts` | nanoid dependency verwijderd; cache-busting verwijderd |
| `shared/schema.ts` | Primary keys op 3 junction tables |
| `README.md` | Docs links bijgewerkt |
| `docs/` (nieuw) | Alle documentatie verplaatst naar docs/ folder |

---

**Rapport gemaakt door:** Code Quality Audit
**Versie:** 1.0
