# Bug Fixes — E2E Test Session Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all bugs and UX issues found during the end-to-end test session, across server, shared schema, and frontend.

**Architecture:** Changes are grouped by risk and dependency. Backend data/auth fixes first (Tasks 1-6), then API design fixes (Tasks 7-9), then frontend UX fixes (Tasks 10-12), with regression tests throughout.

**Tech Stack:** Node.js + Express + TypeScript (server), Drizzle ORM + Zod (schema), React 18 + react-hook-form + Radix UI (client), Vitest + Supertest (tests)

---

## Chunk 1: Critical Server Bugs

### Task 1: Fix `logger` import in `server/routes/students.ts`

**Files:**
- Modify: `server/routes/students.ts:1-14`
- Test: `tests/integration/crud-operations.test.js`

**Context:** `logger.debug(...)` is called at line 122 of `students.ts` but `logger` is never imported. Every `POST /api/students` call throws `ReferenceError: logger is not defined` and returns HTTP 500.

- [ ] **Step 1: Run the existing test to confirm the bug**

```bash
npm run test:integration -- --testNamePattern="create student"
```
Expected: test fails or `POST /api/students` returns 500.

- [ ] **Step 2: Add the logger import**

In `server/routes/students.ts`, add to the import block (after line 13):

```typescript
import { logger } from "../utils/logger";
```

- [ ] **Step 3: Run integration tests to verify fix**

```bash
npm run test:integration
```
Expected: all passing, no `ReferenceError`.

- [ ] **Step 4: Commit**

```bash
git add server/routes/students.ts
git commit -m "fix: add missing logger import in students route"
```

---

### Task 2: Fix session cookie `secure` flag for HTTP deployments

**Files:**
- Modify: `server/auth.ts:147-154`

**Context:** `cookie.secure = process.env.NODE_ENV === 'production'` causes Express-session to refuse sending the cookie over plain HTTP. This breaks any production deployment behind an HTTP reverse proxy unless `trust proxy` is correctly set. The app runs `NODE_ENV=production` locally too, so local testing is broken unless you patch the dist.

The correct fix: let `secure` follow the actual request protocol (via Express's `trust proxy` setting already configured at line 157), or use a dedicated `COOKIE_SECURE` env var for explicit override.

- [ ] **Step 1: Write a test that verifies login returns Set-Cookie**

In `tests/integration/auth.test.js`, add:

```javascript
it("should set session cookie over HTTP when COOKIE_SECURE is not set", async () => {
  const res = await request(app)
    .post("/api/login")
    .send({ username: "stefan", password: "schoolowner123" });
  expect(res.status).toBe(200);
  expect(res.headers["set-cookie"]).toBeDefined();
  expect(res.headers["set-cookie"][0]).toMatch(/musicdott\.sid=/);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm run test:integration -- --testNamePattern="should set session cookie"
```
Expected: FAIL — no `set-cookie` header.

- [ ] **Step 3: Update the cookie secure setting**

In `server/auth.ts`, change line 151:

```typescript
// Before:
secure: process.env.NODE_ENV === 'production',

// After:
secure: process.env.COOKIE_SECURE === 'true',
```

This lets the operator set `COOKIE_SECURE=true` in production (where HTTPS is enforced) and leave it unset (or `false`) for local testing or HTTP-only deployments.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm run test:integration -- --testNamePattern="should set session cookie"
```
Expected: PASS.

- [ ] **Step 5: Update `.env.example` to document the new variable**

In `.env.example`, add after `SESSION_SECRET`:
```
# Set to 'true' in production when HTTPS is in use. Leave unset for HTTP/local.
COOKIE_SECURE=true
```

- [ ] **Step 6: Commit**

```bash
git add server/auth.ts .env.example
git commit -m "fix: use COOKIE_SECURE env var for session cookie instead of NODE_ENV"
```

---

### Task 3: Implement `createMessage` and `getMessages` in `DatabaseStorage`

**Files:**
- Modify: `server/database-storage.ts:1138-1151`
- Test: `tests/integration/crud-operations.test.js`

**Context:** Both `createMessage` and `getMessages` in `DatabaseStorage` are stubbed as no-ops with comments "messages system not fully implemented". The `messages` table exists in the DB and has the correct schema. The route layer (`server/routes/messages.ts`) already calls `storage.createMessage()` and `storage.getMessages()` correctly.

The `messages` table schema (`shared/schema.ts:892-902`):
- `id`, `senderId`, `recipientId`, `senderType`, `recipientType`, `subject`, `content`, `isRead`, `createdAt`

The `POST /api/messages` route body uses `{ recipientId, subject, message }` (note: `message` not `content`) and maps it to `content: message` before calling `createMessage`. This field name inconsistency is a separate UX bug (Task 8).

- [ ] **Step 1: Write a failing integration test for message persistence**

In `tests/integration/crud-operations.test.js`, add:

```javascript
describe("Messages", () => {
  it("should persist a message and retrieve it", async () => {
    // Login as stefan
    const agent = request.agent(app);
    await agent.post("/api/login").send({ username: "stefan", password: "schoolowner123" });

    // Send message to mark (teacher, userId 3)
    const sendRes = await agent
      .post("/api/messages")
      .send({ recipientId: 3, subject: "Test subject", message: "Hello teacher" });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.id).toBeDefined();
    expect(sendRes.body.content).toBe("Hello teacher");

    // Retrieve messages
    const getRes = await agent.get("/api/messages");
    expect(getRes.status).toBe(200);
    expect(getRes.body.length).toBeGreaterThan(0);
    expect(getRes.body[0].content).toBe("Hello teacher");
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm run test:integration -- --testNamePattern="should persist a message"
```
Expected: FAIL.

- [ ] **Step 3: Implement `createMessage` in `DatabaseStorage`**

In `server/database-storage.ts`, replace lines 1148-1151:

```typescript
async createMessage(message: any): Promise<any> {
  const [newMessage] = await db
    .insert(messages)
    .values({
      senderId: message.senderId,
      recipientId: message.recipientId,
      senderType: message.senderType,
      recipientType: message.recipientType,
      subject: message.subject ?? "",
      content: message.content ?? "",
      isRead: message.isRead ?? false,
    })
    .returning();
  return newMessage;
}
```

Make sure `messages` is imported from `@shared/schema` at the top of `database-storage.ts` (check with `grep "from.*schema"` — it likely already is).

- [ ] **Step 4: Implement `getMessages` in `DatabaseStorage`**

Replace lines 1138-1141:

```typescript
async getMessages(userId: number, userType?: string): Promise<any[]> {
  return db
    .select()
    .from(messages)
    .where(
      or(
        eq(messages.senderId, userId),
        eq(messages.recipientId, userId)
      )
    )
    .orderBy(desc(messages.createdAt));
}
```

Ensure `or`, `eq`, `desc` are imported from `drizzle-orm` at the top of the file.

- [ ] **Step 5: Run integration tests**

```bash
npm run test:integration -- --testNamePattern="should persist a message"
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/database-storage.ts
git commit -m "fix: implement createMessage and getMessages in DatabaseStorage"
```

---

### Task 4: Fix session creation — coerce date strings from JSON

**Files:**
- Modify: `server/routes.ts:1120-1123`
- Test: `tests/integration/crud-operations.test.js`

**Context:** `insertSessionSchema` is generated by `createInsertSchema(sessions)` from Drizzle. The `sessions` table has `startTime: timestamp(...)` which maps to `z.date()` in Zod. JSON has no native `Date` type — all values arrive as ISO strings. The schema rejects them with "Expected date, received string".

The fix is to extend the schema locally in the route to coerce the date strings, without touching `shared/schema.ts` (which is also used by the frontend).

- [ ] **Step 1: Write a failing test**

In `tests/integration/crud-operations.test.js`, add:

```javascript
describe("Sessions", () => {
  it("should create a lesson session with ISO date strings", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ username: "stefan", password: "schoolowner123" });

    // Assumes student ID 2 (Emma) and school ID 1 exist from previous test tasks
    const res = await agent.post("/api/sessions").send({
      studentId: 2,
      schoolId: 1,
      title: "Piano Lesson",
      startTime: "2026-04-10T14:00:00.000Z",
      endTime: "2026-04-10T14:45:00.000Z",
      notes: "First lesson",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe("Piano Lesson");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:integration -- --testNamePattern="should create a lesson session"
```
Expected: FAIL with "Expected date, received string".

- [ ] **Step 3: Fix the route to coerce dates**

In `server/routes.ts`, change lines 1120-1123:

```typescript
// Before:
const validatedData = insertSessionSchema.parse({
  ...req.body,
  userId: req.user!.id
});

// After:
const sessionParseSchema = insertSessionSchema.extend({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});
const validatedData = sessionParseSchema.parse({
  ...req.body,
  userId: req.user!.id,
  schoolId: req.body.schoolId ?? req.school?.id ?? req.user!.schoolId,
});
```

Note: this also fixes Bug #9 (schoolId required in body) by falling back to the authenticated user's school context. Make sure `z` is already imported at the top of `routes.ts`.

- [ ] **Step 4: Apply the same coercion to the PUT `/api/sessions/:id` handler**

Check `server/routes.ts` around line 1188 where `insertSessionSchema.partial().parse(req.body)` is used. Apply the same `.extend({ startTime: z.coerce.date().optional(), endTime: z.coerce.date().optional() })` pattern there.

- [ ] **Step 5: Run test to confirm fix**

```bash
npm run test:integration -- --testNamePattern="should create a lesson session"
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/routes.ts
git commit -m "fix: coerce ISO date strings for session startTime/endTime in Zod schema"
```

---

### Task 5: Fix assignment `schoolId` not being set

**Files:**
- Modify: `server/routes.ts:872-876`
- Test: `tests/integration/crud-operations.test.js`

**Context:** The `POST /api/assignments` handler spreads `req.body` into `insertAssignmentSchema.parse(...)` but never sets `schoolId`. The `assignments.schoolId` column is nullable in the DB, so the insert silently succeeds with `null`. This breaks multi-tenant filtering since assignments can't be scoped to a school.

- [ ] **Step 1: Write a failing test**

In `tests/integration/crud-operations.test.js`, add:

```javascript
it("should set schoolId on created assignment", async () => {
  const agent = request.agent(app);
  await agent.post("/api/login").send({ username: "stefan", password: "schoolowner123" });

  const res = await agent.post("/api/assignments").send({
    studentId: 2,
    lessonId: 1,
    title: "Practice scales",
    status: "assigned",
  });
  expect(res.status).toBe(201);
  expect(res.body.schoolId).toBe(1); // stefan's school
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:integration -- --testNamePattern="should set schoolId on created assignment"
```
Expected: FAIL — `schoolId` is null.

- [ ] **Step 3: Fix the route**

In `server/routes.ts`, change lines 872-876:

```typescript
// Before:
const validatedData = insertAssignmentSchema.parse({
  ...req.body,
  userId: req.user!.id,
  dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
});

// After:
const validatedData = insertAssignmentSchema.parse({
  ...req.body,
  userId: req.user!.id,
  schoolId: req.school?.id ?? req.user!.schoolId,
  dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
});
```

- [ ] **Step 4: Run test to confirm fix**

```bash
npm run test:integration -- --testNamePattern="should set schoolId on created assignment"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes.ts
git commit -m "fix: populate schoolId from auth context when creating assignments"
```

---

## Chunk 2: Data Model Fixes

### Task 6: Add `age` column to `students` table

**Files:**
- Modify: `shared/schema.ts` (students table definition)
- Modify: `server/migrations/sql/002_add_student_age.sql` (new migration)
- Modify: `server/routes/students.ts` (use age column instead of notes)
- Test: `tests/integration/crud-operations.test.js`

**Context:** The `students` table has no `age` column. The create-student handler at `server/routes/students.ts:169` appends age into the `notes` field as freetext ("Age: 12"). This is lossy — notes edits overwrite it — and unqueryable. The frontend schema `studentFormSchema` at `client/src/pages/students/index.tsx:59` defines `age: z.string().optional()`, meaning age is passed as a string.

**Note:** The `age` field should stay as a nullable integer column. The frontend sends it as a string; the route must coerce it.

- [ ] **Step 1: Write a failing test**

```javascript
it("should store and return student age as a number", async () => {
  const agent = request.agent(app);
  await agent.post("/api/login").send({ username: "stefan", password: "schoolowner123" });

  const res = await agent.post("/api/students").send({
    name: "Age Test Student",
    instrument: "guitar",
    level: "beginner",
    username: "age_test_" + Date.now(),
    password: "Password1!",
    age: "10",
  });
  expect(res.status).toBe(201);
  expect(res.body.age).toBe(10);
  expect(res.body.notes ?? "").not.toMatch(/Age:/);
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:integration -- --testNamePattern="should store and return student age"
```

- [ ] **Step 3: Add `age` to the Drizzle schema**

In `shared/schema.ts`, in the `students` table definition, add after the `schoolId` field or another appropriate field:

```typescript
age: integer("age"),
```

- [ ] **Step 4: Create migration SQL**

Create `server/migrations/sql/002_add_student_age.sql`:

```sql
-- Migration: 002_add_student_age
ALTER TABLE students ADD COLUMN IF NOT EXISTS age integer;
```

- [ ] **Step 5: Update the create-student route to save age properly**

In `server/routes/students.ts`, in the `storage.createStudent(...)` call (around line 178), change the notes-building logic to NOT include age in notes, and add `age` as a dedicated field:

```typescript
// Step 2: Build notes with parent info only (age gets its own column)
let notes = validatedData.notes || "";
const parentInfo = [];
if (validatedData.parentName) parentInfo.push(`Parent: ${validatedData.parentName}`);
if (validatedData.parentEmail) parentInfo.push(`Parent Email: ${validatedData.parentEmail}`);
if (validatedData.parentPhone) parentInfo.push(`Parent Phone: ${validatedData.parentPhone}`);
if (parentInfo.length > 0) {
  notes = notes ? `${notes}\n\n${parentInfo.join('\n')}` : parentInfo.join('\n');
}

// Step 3: Create student record
student = await storage.createStudent({
  schoolId: req.school.id,
  userId: req.user.id,
  accountId: newUser.id,
  name: validatedData.name,
  email: studentEmail,
  phone: validatedData.phone || null,
  birthdate: validatedData.birthdate || null,
  instrument: validatedData.instrument,
  level: validatedData.level,
  age: validatedData.age ? parseInt(validatedData.age, 10) : null,
  assignedTeacherId: validatedData.assignedTeacherId || null,
  notes: notes || null,
});
```

- [ ] **Step 6: Run migration and tests**

```bash
export DATABASE_URL="postgresql://musicdott:testpass123@127.0.0.1:5432/musicdott"
# The migration runner will pick up 002_add_student_age.sql on next startup.
# For the test run, apply it manually or via npm run db:bootstrap:
psql "$DATABASE_URL" -f server/migrations/sql/002_add_student_age.sql
npm run test:integration -- --testNamePattern="should store and return student age"
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add shared/schema.ts server/migrations/sql/002_add_student_age.sql server/routes/students.ts
git commit -m "feat: add dedicated age column to students table"
```

---

## Chunk 3: API Design Fixes

### Task 7: Fix message route field name inconsistency (`message` vs `content`)

**Files:**
- Modify: `server/routes/messages.ts:30`

**Context:** `POST /api/messages` destructures `const { recipientId, subject, message } = req.body` but the natural API field name (and the DB column name) is `content`. Any client sending `content` instead of `message` will silently store an empty message. The frontend's Messages UI needs to be checked too — it should send `message`.

- [ ] **Step 1: Check what the frontend sends**

```bash
grep -n "apiRequest.*messages\|content\|subject\|message" client/src/pages/messages/index.tsx | head -20
```

- [ ] **Step 2: Add `content` as an accepted alias in the route**

In `server/routes/messages.ts`, change line 30:

```typescript
// Before:
const { recipientId, subject, message } = req.body;

// After:
const { recipientId, subject, message, content } = req.body;
```

And update the `storage.createMessage` call at line 45:

```typescript
// Before:
content: message,

// After:
content: content ?? message ?? "",
```

- [ ] **Step 3: Add a test**

```javascript
it("should accept both 'message' and 'content' field names", async () => {
  const agent = request.agent(app);
  await agent.post("/api/login").send({ username: "stefan", password: "schoolowner123" });

  const res = await agent.post("/api/messages").send({
    recipientId: 3,
    subject: "Test",
    content: "Using content field",
  });
  expect(res.status).toBe(201);
  expect(res.body.content).toBe("Using content field");
});
```

- [ ] **Step 4: Run all message tests**

```bash
npm run test:integration -- --testNamePattern="message"
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/messages.ts
git commit -m "fix: accept content or message field in POST /api/messages"
```

---

### Task 8: Fix lesson `duration` silently discarded

**Files:**
- Modify: `shared/schema.ts` (lessons table)
- Modify: `server/migrations/sql/003_add_lesson_duration.sql` (new migration)

**Context:** The `lessons` table has no `duration` column. When clients send `duration` in `POST /api/lessons`, it is silently dropped. The `sessions` table already has `durationMin integer`. A `durationMin` column should be added to `lessons` too for planning purposes.

- [ ] **Step 1: Add `durationMin` to the lessons table in schema**

In `shared/schema.ts`, in the `lessons` table, add:

```typescript
durationMin: integer("duration_min"),
```

- [ ] **Step 2: Create migration**

Create `server/migrations/sql/003_add_lesson_duration.sql`:

```sql
-- Migration: 003_add_lesson_duration
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration_min integer;
```

- [ ] **Step 3: Update the lessons POST route to accept `duration`**

In `server/routes.ts`, find `app.post("/api/lessons"`. In the validated data spread, add:

```typescript
durationMin: req.body.duration ?? req.body.durationMin ?? null,
```

- [ ] **Step 4: Apply migration and run tests**

```bash
psql "$DATABASE_URL" -f server/migrations/sql/003_add_lesson_duration.sql
npm run test:integration
```

- [ ] **Step 5: Commit**

```bash
git add shared/schema.ts server/migrations/sql/003_add_lesson_duration.sql server/routes.ts
git commit -m "feat: add durationMin column to lessons table"
```

---

## Chunk 4: Frontend UX Fixes

### Task 9: Add empty state to the Students list

**Files:**
- Modify: `client/src/pages/students/index.tsx:827-961`

**Context:** When `filteredStudents` is an empty array, the grid renders nothing — no message, no CTA. The user sees a blank area which looks broken.

- [ ] **Step 1: Find the render location**

The students grid is in `client/src/pages/students/index.tsx` around line 827-960. The structure is:

```tsx
) : (
  <div className="grid ...">
    {filteredStudents.map((student) => (...))}
  </div>
)}
```

- [ ] **Step 2: Add the empty state**

Replace the grid block with:

```tsx
) : filteredStudents.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Users className="h-12 w-12 text-gray-300 mb-4" />
    <h3 className="text-lg font-medium text-gray-500 mb-2">No students yet</h3>
    <p className="text-sm text-gray-400 mb-6">
      {searchTerm
        ? "No students match your search."
        : "Add your first student to get started."}
    </p>
    {!searchTerm && (
      <RequireTeacher>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add First Student
        </Button>
      </RequireTeacher>
    )}
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {filteredStudents.map((student: any) => (
```

Make sure `Users` is imported from `lucide-react` (check the existing imports at the top of the file).

- [ ] **Step 3: Verify visually**

Start the dev server and navigate to `/students` when no students exist. Confirm the empty state shows.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/students/index.tsx
git commit -m "ux: add empty state to students list page"
```

---

### Task 10: Mark required fields with asterisk in Add Student form

**Files:**
- Modify: `client/src/pages/students/index.tsx` (Instrument, Username, Password, Name labels in the Add and Update dialogs)

**Context:** The Zod schema `studentFormSchema` marks `name`, `instrument`, `username`, and `password` as required (`.min(1)`). None of the form labels show an asterisk (`*`) to signal this to the user. The error only appears after submit.

- [ ] **Step 1: Add asterisk spans to required labels in the Add dialog**

Find each `<FormLabel>` for `name`, `instrument`, `username`, and `password` in the Add dialog (lines ~599, ~670, ~753, ~771) and update to:

```tsx
// Example for instrument:
<FormLabel>Instrument <span className="text-red-500">*</span></FormLabel>
```

Apply the same pattern for: Full Name, Username, Password in the Add dialog.

- [ ] **Step 2: Apply the same fix to the Update dialog**

The Update dialog (starting around line 965) has the same form fields — apply the same asterisk pattern there.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/students/index.tsx
git commit -m "ux: mark required fields with asterisk in student forms"
```

---

### Task 11: Fix Schedule Session dialog missing `schoolId`

**Files:**
- Modify: `client/src/pages/students/index.tsx:362-374`

**Context:** The `scheduleSessionMutation` at line 362 sends `POST /api/sessions` without `schoolId`. The server's `insertSessionSchema` requires `schoolId: integer().notNull()`. After Task 4's server fix, the server will infer `schoolId` from the session context — but as a belt-and-suspenders fix, the frontend can also pass the school context if it's available.

Since the server fix (Task 4) already falls back to `req.school?.id ?? req.user!.schoolId`, this task is only needed if you want belt-and-suspenders. **Mark as done if Task 4 server fix fully covers the case.**

- [ ] **Step 1: Verify session scheduling works after Task 4**

With the Task 4 fix applied, test the Schedule Session dialog in the browser (or via API without `schoolId`):

```bash
curl -b /tmp/md-c.txt -X POST http://127.0.0.1:3001/api/sessions \
  -H "Content-Type: application/json" -H "Origin: http://127.0.0.1:3001" \
  -d '{"studentId":2,"title":"Piano Test","startTime":"2026-04-10T14:00:00.000Z","endTime":"2026-04-10T14:45:00.000Z"}'
```
Expected: HTTP 201 with session object.

- [ ] **Step 2: Commit (only if frontend change needed)**

If the server-side fix is sufficient, skip this step. Otherwise update `scheduleSessionMutation` in the frontend to add `schoolId` from the user context.

---

### Task 12: Fix login form autofill — React state sync with browser autofill

**Files:**
- Modify: `client/src/pages/auth/index.tsx` (or wherever the login form lives)

**Context:** When the browser pre-fills the login form, the React controlled input state remains empty. Clicking Login sends `username: ""` / `password: ""` and fails silently (or shows a generic error). The fix is to use `defaultValue` + `ref`-based form submission, or to add `autoComplete` attributes that trigger React's `onChange` correctly.

- [ ] **Step 1: Find the login form**

```bash
find client/src -name "*.tsx" | xargs grep -l "login\|Login\|POST.*login" | head -3
```

- [ ] **Step 2: Add `autoComplete` attributes**

In the login form's username input, ensure:
```tsx
<Input
  type="text"
  autoComplete="username"
  {...field}
/>
```

And for password:
```tsx
<Input
  type="password"
  autoComplete="current-password"
  {...field}
/>
```

These `autoComplete` attributes cause the browser to dispatch proper DOM input events, which React-hook-form's `{...field}` spread picks up via its `onChange` handler.

- [ ] **Step 3: Test**

Open the login page in Chrome. Let the browser suggest a saved password. Select it. Verify the form fields show the values and submitting works.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/auth/index.tsx
git commit -m "ux: add autocomplete attributes to login form inputs"
```

---

## Chunk 5: Infrastructure Fixes (Source Code, not just dist patches)

### Task 13: Fix startup race condition — async DB health check

**Files:**
- Modify: `server/storage-wrapper.ts`
- Modify: `server/db.ts`

**Context:** `isDatabaseAvailable` in `server/db.ts` is a module-level `let` variable set asynchronously after the health check completes. `initializeStorage()` in `server/storage-wrapper.ts` reads this variable synchronously. If `initializeStorage()` runs before the health check callback fires, it sees `isDatabaseAvailable = false` and falls back to memory mode even when the DB is healthy.

The current workaround (3s sleep in dist) is fragile. The proper fix is to make `initializeStorage()` await the DB health check directly, or export a `waitForDb()` promise from `db.ts`.

- [ ] **Step 1: Export a `dbReady` promise from `server/db.ts`**

In `server/db.ts`, find where `isDatabaseAvailable` is set (likely in a `.then()` or async function). Refactor to export a promise:

```typescript
// In db.ts, replace or supplement the isDatabaseAvailable let with:
export let isDatabaseAvailable = false;

export const dbReady: Promise<boolean> = (async () => {
  try {
    await pool.query("SELECT 1");
    isDatabaseAvailable = true;
    return true;
  } catch {
    isDatabaseAvailable = false;
    return false;
  }
})();
```

- [ ] **Step 2: Await `dbReady` in `storage-wrapper.ts`**

In `server/storage-wrapper.ts`, in the `initializeStorage()` method, replace the synchronous `isDatabaseAvailable` check with:

```typescript
import { dbReady, isDatabaseAvailable } from "./db";

// Inside initializeStorage():
await dbReady; // ensure health check has completed
if (isDatabaseAvailable) {
  // ... proceed with DatabaseStorage
}
```

- [ ] **Step 3: Remove the dist hack**

In `dist/index.cjs`, the 3-second `setTimeout` workaround was applied manually. After fixing the source and rebuilding, this hack is no longer needed. Note it in a comment or remove it (the dist will be regenerated by `npm run build`).

- [ ] **Step 4: Run integration tests**

```bash
npm run test:integration
```

- [ ] **Step 5: Commit**

```bash
git add server/db.ts server/storage-wrapper.ts
git commit -m "fix: eliminate startup race condition by awaiting dbReady promise"
```

---

### Task 14: Fix `reusePort` ENOTSUP and hardcoded port 5000

**Files:**
- Modify: `server/index.ts:417-422` (the `server.listen()` call)

**Context:** The production server was patched in `dist/index.cjs` to remove `reusePort: true` and use `PORT` env var. The source `server/index.ts` already has the fix applied (from an earlier session commit). Verify the source is correct and the dist patch is in sync.

- [ ] **Step 1: Verify `server/index.ts` uses correct listen call**

```bash
grep -n "server.listen\|reusePort\|host.*0.0.0.0\|host.*127" server/index.ts
```
Expected output (correct): `server.listen({ port: parseInt(process.env.PORT || "5000"), host: "127.0.0.1" }, ...)` with no `reusePort`.

If the source still has `reusePort: true`, change it:

```typescript
// In server/index.ts, startServer() function:
server.listen({
  port: parseInt(process.env.PORT || "5000"),
  host: "127.0.0.1",
}, (error?: Error) => {
```

- [ ] **Step 2: Verify `.env.example` documents PORT**

```bash
grep "PORT" .env.example
```

If missing, add: `PORT=5000  # Change if 5000 is occupied (macOS AirPlay uses 5000)`

- [ ] **Step 3: Commit if source change needed**

```bash
git add server/index.ts .env.example
git commit -m "fix: remove reusePort and use PORT env var in server listen config"
```

---

### Task 15: Add missing migration columns and verify migration runner

**Files:**
- Modify: `server/migrations/sql/001_initial_schema.sql`
- Verify: `server/migrations-runner.ts`

**Context:** During bootstrap, two columns were missing from the SQL migration:
- `external_integrations jsonb` on `schools`
- `external_id text` and `external_source text` on `students`

These were manually `ALTER TABLE`'d in. They should be in the initial schema migration so new deployments don't break.

- [ ] **Step 1: Add missing columns to `001_initial_schema.sql`**

In `server/migrations/sql/001_initial_schema.sql`, find the `CREATE TABLE schools` statement and add:

```sql
external_integrations jsonb,
```

In the `CREATE TABLE students` statement, add:

```sql
external_id text,
external_source text,
```

- [ ] **Step 2: Also add to `shared/schema.ts` if not already present**

```bash
grep "externalIntegrations\|externalId\|externalSource" shared/schema.ts
```
If present, these are already in the TypeScript schema — good. Confirm the SQL migration now matches.

- [ ] **Step 3: Test a fresh bootstrap**

On a fresh DB or by dropping and recreating:
```bash
# Drop and recreate test DB to verify migrations work from scratch
dropdb --if-exists musicdott_test
createdb musicdott_test
DATABASE_URL="postgresql://musicdott:testpass123@127.0.0.1:5432/musicdott_test" \
  npm run db:bootstrap
```
Expected: no column-does-not-exist errors.

- [ ] **Step 4: Commit**

```bash
git add server/migrations/sql/001_initial_schema.sql
git commit -m "fix: add missing external_integrations, external_id, external_source columns to migration"
```

---

## Final Steps

### Task 16: Full test suite + rebuild dist

- [ ] **Step 1: Run all tests**

```bash
npm run ci
```
Expected: all unit, integration, and smoke tests pass; build succeeds.

- [ ] **Step 2: Rebuild dist**

```bash
npm run build
```
This regenerates `dist/index.cjs` from the fixed source, replacing all manual patches.

- [ ] **Step 3: Smoke test the rebuilt dist**

```bash
DATABASE_URL="postgresql://musicdott:testpass123@127.0.0.1:5432/musicdott" \
  NODE_ENV=production COOKIE_SECURE=false PORT=3001 \
  SESSION_SECRET="UUskrp2nNs9xLos7mPUvKqaEAeuqiZ/I5WGpM/eOcfA=" \
  node dist/index.cjs &
sleep 5
curl -s -c /tmp/smoke-cookies.txt -X POST http://127.0.0.1:3001/api/login \
  -H "Content-Type: application/json" -H "Origin: http://127.0.0.1:3001" \
  -d '{"username":"stefan","password":"schoolowner123"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK:', d['role'])"
```
Expected: `OK: school_owner`

- [ ] **Step 4: Final commit**

```bash
git add dist/index.cjs
git commit -m "build: rebuild dist after all bug fixes"
```

---

## Bug Fix Summary

| Task | Bug | File(s) | Severity |
|------|-----|---------|----------|
| 1 | `logger` import missing → student creation 500 | `server/routes/students.ts` | Critical |
| 2 | Session cookie `secure=true` over HTTP | `server/auth.ts` | Critical |
| 3 | `createMessage`/`getMessages` are no-ops | `server/database-storage.ts` | Critical |
| 4 | Zod `z.date()` rejects ISO strings in session schema | `server/routes.ts` | Critical |
| 5 | Assignment `schoolId` always null | `server/routes.ts` | High |
| 6 | `age` stored in notes freetext, no dedicated column | `shared/schema.ts`, `server/routes/students.ts` | High |
| 7 | Message `content` vs `message` field name mismatch | `server/routes/messages.ts` | High |
| 8 | Lesson `duration` silently discarded | `shared/schema.ts`, `server/routes.ts` | Medium |
| 9 | Session POST requires `schoolId` from client | `server/routes.ts` (covered in Task 4) | High |
| 10 | Students list has no empty state | `client/src/pages/students/index.tsx` | Medium |
| 11 | Required fields not marked with asterisk | `client/src/pages/students/index.tsx` | Medium |
| 12 | Login autofill doesn't trigger React state | `client/src/pages/auth/index.tsx` | Medium |
| 13 | DB startup race condition | `server/db.ts`, `server/storage-wrapper.ts` | High |
| 14 | `reusePort` ENOTSUP + hardcoded port 5000 | `server/index.ts` | Medium |
| 15 | Missing migration columns (external_integrations etc.) | `server/migrations/sql/001_initial_schema.sql` | Medium |
