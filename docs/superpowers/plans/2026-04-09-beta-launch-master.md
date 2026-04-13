# Musicdott Beta Launch — Master Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Musicdott to beta — fix all known bugs, launch a high-converting landing page, add error monitoring, and produce a verified staging deployment.

**Architecture:** Six sequential chunks. Chunks 1-4 delegate to existing detailed sub-plans; Chunks 5-6 are new work. Chunks 1-3 must land before Chunk 4, and both must land before Chunks 5-6. Each chunk ends with a passing CI run.

**Tech Stack:** Node.js 20 + Express + TypeScript (server), React 18 + Vite + Tailwind + Radix UI (client), Drizzle ORM + PostgreSQL 16, Vitest + Supertest (tests), Docker + Nginx (deploy), Sentry (monitoring)

---

## Chunk 1: Critical Server Bugs (Tasks 1–5)

> **Delegate to:** `docs/superpowers/plans/2026-04-07-bug-fixes-e2e-test.md` — **Chunk 1 (Tasks 1–5)**

These are the blocking bugs found during the E2E test session. Execute in order — Task 4 (date coercion) also resolves part of Task 9 (session `schoolId`).

| # | Task | File(s) | Impact |
|---|------|---------|--------|
| 1 | Add missing `logger` import | `server/routes/students.ts:1-14` | HTTP 500 on every student create |
| 2 | Fix session cookie `secure` flag | `server/auth.ts:151` | Login broken on HTTP / behind proxy |
| 3 | Implement `createMessage` + `getMessages` | `server/database-storage.ts:1138-1151` | Messages silently lost |
| 4 | Coerce ISO date strings in session create/update | `server/routes.ts:1120-1123, ~1188` | Session create always 400 |
| 5 | Populate `schoolId` on assignment create | `server/routes.ts:872-876` | Assignments unscoped to school |

- [ ] **Execute Chunk 1 of `2026-04-07-bug-fixes-e2e-test.md`** (Tasks 1–5)

- [ ] **Verify: run full integration test suite**

```bash
npm run test:integration
```
Expected: all tests pass, no errors.

- [ ] **Verify: TypeScript check**

```bash
npm run check
```
Expected: 0 errors.

---

## Chunk 2: Data Model & API Design Fixes (Tasks 6–9)

> **Delegate to:** `docs/superpowers/plans/2026-04-07-bug-fixes-e2e-test.md` — **Chunks 2 & 3 (Tasks 6–9)**

| # | Task | File(s) | Impact |
|---|------|---------|--------|
| 6 | Add `age` column to `students` table | `shared/schema.ts`, `server/migrations/sql/002_add_student_age.sql`, `server/routes/students.ts` | Age stored as freetext in notes |
| 7 | Fix message field name (`message` vs `content`) | `server/routes/messages.ts:30,45` | Messages silently empty |
| 8 | Return full teacher object on create | `server/routes/teachers.ts` | Frontend can't display new teacher |
| 9 | Return full student object on update | `server/routes/students.ts` | Frontend stale after edit |

- [ ] **Execute Chunks 2 & 3 of `2026-04-07-bug-fixes-e2e-test.md`** (Tasks 6–9)

- [ ] **Verify: run integration tests**

```bash
npm run test:integration
```
Expected: all passing.

- [ ] **Verify: TypeScript check**

```bash
npm run check
```

---

## Chunk 3: Frontend UX Fixes (Tasks 10–12)

> **Delegate to:** `docs/superpowers/plans/2026-04-07-bug-fixes-e2e-test.md` — **Chunk 4 (Tasks 10–12)**

| # | Task | File(s) | Impact |
|---|------|---------|--------|
| 10 | Fix modal not closing after create | `client/src/pages/students/index.tsx`, `client/src/pages/teachers/index.tsx` | User stuck in open modal |
| 11 | Reset form after successful submit | Same files as Task 10 | Form shows stale data on second open |
| 12 | Show inline validation errors from API | Form components across pages | Silent failures on bad input |

- [ ] **Execute Chunk 4 of `2026-04-07-bug-fixes-e2e-test.md`** (Tasks 10–12)

- [ ] **Verify: TypeScript check**

```bash
npm run check
```

- [ ] **Verify: full CI run (lint + unit + integration + build)**

```bash
npm run ci
```
Expected: all steps green. This is the regression gate before the landing page work.

---

## Chunk 4: Landing Page Redesign (Tasks 1–11)

> **Delegate to:** `docs/superpowers/plans/2026-04-07-landing-page-redesign.md` — **All Chunks**

The current `/auth` page is a login form only. This chunk replaces it with a high-converting Apple-minimalist sales page with Teach Mode as the hero.

| # | Task | Component |
|---|------|-----------|
| 1 | Rewrite `landing-nav.tsx` | Sticky nav with navy CTA + language selector |
| 2 | Rewrite `landing-hero.tsx` | Split-screen Teach Mode preview panel |
| 3 | Write `landing-problem.tsx` | Pain points for music teachers |
| 4 | Write `landing-statement.tsx` | "Built around the lesson" statement |
| 5 | Write `landing-teach-mode.tsx` | Full Teach Mode feature breakdown |
| 6 | Write `landing-features.tsx` | Scheduling, billing, library feature grid |
| 7 | Write `landing-social-proof.tsx` | Testimonials and school logos |
| 8 | Write `landing-pricing.tsx` | Three-tier pricing with `getPricingText` |
| 9 | Write `landing-faq.tsx` | Common objections addressed |
| 10 | Write `landing-footer.tsx` | Links, social, GDPR/AVG badge |
| 11 | Wire all components into `client/src/pages/auth/index.tsx` | Auth page updated to show landing |

- [ ] **Execute all chunks of `2026-04-07-landing-page-redesign.md`**

- [ ] **Verify: TypeScript check**

```bash
npm run check
```
Expected: 0 errors.

- [ ] **Verify: production build succeeds**

```bash
npm run build
```
Expected: build completes without errors. Chunk warnings for music notation libs are acceptable.

---

## Chunk 5: Error Monitoring & CLAUDE.md

### Task 13: Add Sentry error monitoring (backend)

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `server/index.ts` (init Sentry before everything else)
- Modify: `server/middleware/error-handler.ts` (report to Sentry in error handler)
- Modify: `.env.example` (add `SENTRY_DSN`)

**Context:** Unhandled exceptions are currently only logged to the console. In production we need them captured, deduped, and alerted on. `@sentry/node` integrates with Express and auto-instruments routes, DB queries, and HTTP calls.

- [ ] **Step 1: Install Sentry Node SDK**

```bash
npm install @sentry/node
```

- [ ] **Step 2: Initialize Sentry at the very top of `server/index.ts`**

Add this block **before all other imports** (Sentry must be the first import to instrument modules):

```typescript
// server/index.ts — add at top, before other imports
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    // Capture 100% of transactions in dev; tune down in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}
```

- [ ] **Step 3: Add Sentry request handler middleware**

In the Express setup section of `server/index.ts` (where other middleware is registered, before routes), add:

```typescript
// Add AFTER app creation, BEFORE routes
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}
```

- [ ] **Step 4: Capture unexpected errors in `server/middleware/error-handler.ts`**

In the `errorHandler` function, in the "Handle unexpected errors" block (currently at line 89), add Sentry capture:

```typescript
// Handle unexpected errors
if (process.env.SENTRY_DSN) {
  const Sentry = await import("@sentry/node");
  Sentry.captureException(err, { extra: { path: req.path, method: req.method } });
}
console.error("Unexpected error:", err);
```

**Note:** Only capture non-operational errors (not `AppError` instances) — those are expected and would create noise.

Actually, replace the block starting at line 88 with:

```typescript
// Unexpected (non-operational) errors → capture in Sentry
if (!(err instanceof AppError)) {
  if (process.env.SENTRY_DSN) {
    // dynamic import so startup isn't blocked if Sentry isn't installed
    import("@sentry/node").then(({ captureException }) =>
      captureException(err, { extra: { path: req.path, method: req.method } })
    );
  }
  console.error("Unexpected error:", err);
}
```

- [ ] **Step 5: Add Sentry error handler middleware (must be last)**

At the end of the Express middleware chain in `server/index.ts`, before `app.use(errorHandler)`:

```typescript
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}
app.use(notFoundHandler);
app.use(errorHandler);
```

- [ ] **Step 6: Document the env var in `.env.example`**

Add after `COOKIE_SECURE`:

```
# Sentry DSN for error monitoring. Leave unset to disable.
# Get your DSN from https://sentry.io → Project Settings → Client Keys
SENTRY_DSN=
```

- [ ] **Step 7: TypeScript check**

```bash
npm run check
```
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add server/index.ts server/middleware/error-handler.ts .env.example package.json package-lock.json
git commit -m "feat: add Sentry error monitoring to backend"
```

---

### Task 14: Add Sentry error monitoring (frontend)

**Files:**
- Modify: `client/src/main.tsx` (wrap app with Sentry ErrorBoundary)
- Modify: `vite.config.ts` (add Sentry Vite plugin for source maps, optional)

**Context:** React errors that crash a component tree are currently uncaught. Sentry's `ErrorBoundary` captures them and shows a fallback UI instead of a blank screen.

- [ ] **Step 1: Install Sentry React SDK**

```bash
npm install @sentry/react
```

- [ ] **Step 2: Rewrite `client/src/main.tsx`**

```tsx
import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

const FallbackComponent = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
    <h1 className="text-2xl font-bold text-gray-800">Er is iets misgegaan</h1>
    <p className="text-gray-500">
      Het probleem is automatisch gemeld. Vernieuw de pagina om opnieuw te proberen.
    </p>
    <button
      className="px-4 py-2 bg-[#1B2B6B] text-white rounded-lg text-sm"
      onClick={() => window.location.reload()}
    >
      Pagina vernieuwen
    </button>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<FallbackComponent />}>
    <App />
  </Sentry.ErrorBoundary>
);
```

- [ ] **Step 3: Add `VITE_SENTRY_DSN` to `.env.example`**

```
# Frontend Sentry DSN (same project, different key). Prefix VITE_ makes it available to the browser bundle.
VITE_SENTRY_DSN=
```

- [ ] **Step 4: TypeScript check**

```bash
npm run check
```
Expected: 0 errors.

- [ ] **Step 5: Production build check**

```bash
npm run build
```
Expected: builds successfully. The `@sentry/react` bundle will be included in the vendor chunk.

- [ ] **Step 6: Commit**

```bash
git add client/src/main.tsx .env.example package.json package-lock.json
git commit -m "feat: add Sentry ErrorBoundary and browser monitoring to frontend"
```

---

### Task 15: Create `CLAUDE.md`

**Files:**
- Create: `CLAUDE.md`

**Context:** There is no `CLAUDE.md` in this repo. Future Claude sessions start with zero context, leading to repeated exploration and inconsistent decisions. This file documents architecture, conventions, and key commands once so every session starts from the same baseline.

- [ ] **Step 1: Create `CLAUDE.md` at the repo root**

```markdown
# Musicdott — CLAUDE.md

## What This Is
MusicDott is a multi-tenant SaaS platform for music schools and private music teachers.
It manages students, lessons, scheduling, billing, and real-time "Teach Mode" lesson delivery.

## Architecture

### Role Hierarchy (RBAC)
Platform Owner → School Owner → Teacher → Student

Every API route is scoped to `req.school.id` via the `requireSchoolContext` middleware.
Never skip this — it is the multi-tenancy boundary.

### Key Patterns
- **Storage layer**: All DB access goes through `server/storage-wrapper.ts` → `server/database-storage.ts`. Never use Drizzle directly in routes.
- **Zod schemas**: All insert schemas live in `shared/schema.ts` (generated by `createInsertSchema`). Extend them locally in routes when you need coercion (e.g. `z.coerce.date()`), do NOT edit the shared schemas.
- **Content blocks**: Defined in `shared/content-blocks.ts`. Each block type has a discriminated union. Do not add `any` casts to block types.
- **Real-time**: Socket.IO events are typed in `shared/events.ts`. Teach Mode push goes through `server/services/teach-mode.ts`.
- **i18n**: Translation keys live in `client/src/i18n/locales/`. Dutch (`nl`) is primary; English (`en`) is secondary. Both must be updated together.

### Directory Structure
```
server/           Node.js + Express backend
  routes/         One file per resource (students, teachers, lessons, etc.)
  services/       Business logic (billing, teach-mode, notifications)
  middleware/     Auth, multi-tenant enforcement, security headers
  database-storage.ts  Drizzle ORM data access layer
client/src/
  pages/          One directory per route/feature
  components/     Reusable UI (lesson editor, content blocks, landing page)
  i18n/           Translation files
shared/
  schema.ts       Drizzle table definitions + Zod insert schemas
  content-blocks.ts  Content block type definitions
  events.ts       Socket.IO event types
```

## Commands

```bash
npm run dev           # Start dev server (port 5000)
npm run build         # Build frontend + server for production
npm run check         # TypeScript check (fast, no emit)
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests (requires DB)
npm run test:smoke    # Content block contract tests
npm run ci            # Full CI: lint + unit + integration + smoke + build
npm run db:bootstrap  # Migrate + seed the database
npm run db:migrate    # Run migrations only
npm run db:seed       # Seed only
```

## Test Credentials (local dev)

| Role | Username | Password |
|------|----------|----------|
| Platform Owner | `platform_owner` | `platformowner123` |
| School Owner | `stefan` | `schoolowner123` |
| Teacher | `mark` | `teacher123` |
| Student | `emma` | `student123` |

All seeded by `npm run db:seed`. School ID for stefan = 1.

## Environment Variables

See `.env.example` for the full list. Minimum required for dev:
```
DATABASE_URL=postgresql://musicdott:testpass123@localhost:5432/musicdott
SESSION_SECRET=<random 32+ char string>
COOKIE_SECURE=         # Leave empty for HTTP dev; set to 'true' for HTTPS prod
SENTRY_DSN=            # Optional — leave empty to disable
VITE_SENTRY_DSN=       # Optional — leave empty to disable
```

## Conventions
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- TypeScript strict mode. No `any` except in legacy DB storage methods (TODO to clean up).
- All new API routes must: (a) use `requireAuth`, (b) use `requireSchoolContext`, (c) validate with Zod, (d) use `asyncHandler`.
- Tests live in `tests/unit/`, `tests/integration/`, `tests/e2e/`. Integration tests use a real DB.
```

- [ ] **Step 2: Verify TypeScript check still passes**

```bash
npm run check
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with architecture, commands, and test credentials"
```

---

## Chunk 6: Beta Deploy Preparation

### Task 16: Full CI verification

**Context:** Before deploying to staging, run the complete CI pipeline to confirm there are no regressions from all the work in Chunks 1–5.

- [ ] **Step 1: Run full CI**

```bash
npm run ci
```
Expected output:
```
✓ lint (tsc --noEmit, 0 errors)
✓ test:unit (all passing)
✓ test:integration (all passing)
✓ test:smoke (content block contracts passing)
✓ build (dist/ created, no errors)
```

If anything fails: fix it before proceeding to deployment. Do not ship a failing CI.

---

### Task 17: Verify Docker production build

**Files:**
- Read: `Dockerfile`
- Read: `docker-compose.yml`
- Read: `docs/DEPLOYMENT.md`

**Context:** The app ships as a Docker container. Verify the image builds cleanly from the current state, and that `docker compose up` starts the full stack (app + PostgreSQL).

- [ ] **Step 1: Build the Docker image**

```bash
cd /Users/stefanvandebrug/Documents/Git-Apps/Musicdott
docker build -t musicdott:beta-rc1 .
```
Expected: build completes with no errors. Note the final image size.

- [ ] **Step 2: Start the full stack with docker compose**

```bash
docker compose up -d
```
Expected: `musicdott-app` and `musicdott-db` containers start.

- [ ] **Step 3: Check app health**

```bash
docker compose logs app --tail=30
```
Expected: `Server listening on port 5000` (or equivalent), no crash loops.

- [ ] **Step 4: Check the app responds**

```bash
curl -s http://localhost:5000/api/health | head -5
# or
curl -I http://localhost:5000
```
Expected: HTTP 200 response.

- [ ] **Step 5: Stop the stack**

```bash
docker compose down
```

- [ ] **Step 6: Commit any Dockerfile fixes if needed**

```bash
git add Dockerfile docker-compose.yml
git commit -m "fix: ensure Docker production build works with beta config"
```

---

### Task 18: Manual smoke test on staging

**Context:** Deploy to the staging environment and run the critical-flow smoke test from `docs/smoke-test-critical-flows.md`. This is the final gate before inviting beta users.

- [ ] **Step 1: Deploy to staging** (follow `docs/DEPLOYMENT.md`)

Key steps (abbreviated — see DEPLOYMENT.md for full detail):
1. Set all required env vars on the staging server (see DEPLOYMENT.md §Environment Variables)
2. Copy `.env.example` to `.env` on the server, fill in real values: `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECURE=true`, `SENTRY_DSN`, `VITE_SENTRY_DSN`, `STRIPE_SECRET_KEY`, `SENDGRID_API_KEY`
3. `docker compose pull && docker compose up -d`
4. `docker compose exec app npm run db:bootstrap` (first deploy only)

- [ ] **Step 2: Run smoke tests from `docs/smoke-test-critical-flows.md`**

Work through each section manually in the staging browser. For each:
- ✅ Check: network tab shows expected HTTP status codes
- ✅ Check: no errors in browser console
- ✅ Check: data persists after page refresh

Sections to cover:
1. **Agenda** — create/edit/delete recurring schedule
2. **JSON Import** — import lesson + song with content blocks
3. **POS Sync** — dry run preview
4. **Login flow** — all four roles (platform owner, school owner, teacher, student)
5. **Messaging** — send message teacher → student and verify receipt
6. **Teach Mode** — start session, push a content block, verify it appears on student side
7. **Billing** — view subscription page, verify Stripe integration doesn't 500
8. **Landing page** — navigate to `/`, verify all sections render, CTA buttons work

- [ ] **Step 3: Verify Sentry receives events**

In the Sentry dashboard:
1. Navigate to a non-existent route (e.g. `/api/does-not-exist`) — should see a 404 in Sentry (or nothing if 404s are filtered, which is fine)
2. Check that the project shows up as connected

- [ ] **Step 4: Create `BETA_LAUNCH_CHECKLIST.md` with sign-off**

Create `docs/BETA_LAUNCH_CHECKLIST.md`:

```markdown
# Beta Launch Checklist

## Technical (sign off before inviting users)
- [ ] CI green (`npm run ci`)
- [ ] Docker build succeeds
- [ ] Staging deployed and healthy
- [ ] All smoke tests pass (see `docs/smoke-test-critical-flows.md`)
- [ ] Sentry receiving events
- [ ] COOKIE_SECURE=true in production
- [ ] SESSION_SECRET is a strong random value (not the example value)
- [ ] STRIPE_SECRET_KEY is the LIVE key (not test key) — or test key for limited beta
- [ ] Database backups configured on the server

## Content
- [ ] Landing page copy reviewed (no placeholder text)
- [ ] Pricing tiers reflect actual pricing decisions
- [ ] FAQ answers reviewed and accurate
- [ ] Privacy policy / AVG verklaring linked from footer
- [ ] Contact email in footer is monitored

## Access
- [ ] Beta invite list prepared
- [ ] Feedback channel set up (email / Discord / Slack)
- [ ] Support contact visible in the app
```

- [ ] **Step 5: Commit**

```bash
git add docs/BETA_LAUNCH_CHECKLIST.md
git commit -m "docs: add beta launch checklist"
```

---

## Summary

| Chunk | Tasks | What changes | Gate |
|-------|-------|-------------|------|
| 1 | 1–5 | Critical server bugs fixed | `npm run test:integration` green |
| 2 | 6–9 | Data model + API field fixes | `npm run test:integration` green |
| 3 | 10–12 | Frontend UX fixes | `npm run ci` green |
| 4 | 1–11 (landing) | Full landing page live | `npm run build` green |
| 5 | 13–15 | Sentry + CLAUDE.md | `npm run check` green |
| 6 | 16–18 | Docker build + staging smoke test | Manual sign-off |

**Execution order is strict.** Chunks 1–3 share the same codebase areas and must not be parallelized. Chunk 4 (landing page) is independent of Chunks 1–3 and *can* run in a separate worktree in parallel if subagents are available. Chunks 5–6 require Chunks 1–4 to be merged first.
