# Teacher Copilot API Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the existing `TeacherCopilot` service via a `POST /api/ai/copilot` route so teachers can query the AI assistant from the client.

**Architecture:** The service class (`server/ai-services/teacher-copilot.ts`) is fully built with OpenAI integration. The only missing piece is the route in `server/routes/ai-services.ts` and updating the `/status` endpoint to include `copilot`. No client UI for MVP — the route alone unblocks frontend integration.

**Tech Stack:** Node.js + Express + TypeScript, OpenAI gpt-4o-mini, Drizzle ORM via `server/storage-wrapper.ts`, Zod validation.

---

## Chunk 1: Route + Integration Test

### Task 1: Fix TypeScript errors in `ai-services.ts` + add copilot route

**Files:**
- Modify: `server/routes/ai-services.ts`

**Context:** `server/routes/ai-services.ts` has two syntax errors that must be fixed first:
1. Lines 138-140: malformed ternary operator — `? await X ? await Y` should be `? await X : await Y`
2. Lines 154-155: extra `}` before the catch block closing brace

Then add the copilot route. The `teacherCopilot` singleton is at `server/ai-services/teacher-copilot.ts`. Storage is imported as `import { storage } from "../storage-wrapper"`.

First confirm the errors exist:
```bash
npm run check 2>&1 | head -30
```

- [ ] **Step 1: Add integration test**

In `tests/integration/crud-operations.test.js`, add a new describe block near the end (before the final closing bracket):

```javascript
describe("Teacher Copilot", () => {
  it("should return copilot response for a teacher query", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ username: "mark", password: "teacher123" });

    const res = await agent
      .post("/api/ai/copilot")
      .send({
        queryText: "My student struggles with left-hand coordination. Any exercises?",
        studentId: null,
        context: { instrument: "Piano", studentLevel: "Beginner" },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toBeDefined();
    expect(res.body.response.suggestions).toBeDefined();
    expect(Array.isArray(res.body.response.suggestions)).toBe(true);
  });

  it("should reject unauthenticated copilot requests", async () => {
    const res = await request(app)
      .post("/api/ai/copilot")
      .send({ queryText: "test" });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:integration -- --testNamePattern="Teacher Copilot"
```

Expected: 404 (route doesn't exist yet).

- [ ] **Step 3: Fix syntax errors in `server/routes/ai-services.ts`**

Fix line ~138-155 (smart-assignment handler). The malformed ternary looks like:
```typescript
    const assignment = data.groovePatternId 
      ? await smartAssignmentBuilder.buildGrooveAssignment(data)
      ? await smartAssignmentBuilder.buildSmartAssignment(data);
```
Replace with:
```typescript
    const assignment = data.groovePatternId
      ? await smartAssignmentBuilder.buildGrooveAssignment(data)
      : await smartAssignmentBuilder.buildSmartAssignment(data);
```

Also remove the extra `}` that appears before the closing `});` of the smart-assignment route handler.

- [ ] **Step 4: Add imports and copilot route to `server/routes/ai-services.ts`**

At the top of the file, after the existing imports, add:
```typescript
import { teacherCopilot } from "../ai-services/teacher-copilot";
import { storage } from "../storage-wrapper";
```

Add a Zod schema after the existing schemas (around line 53):
```typescript
const copilotQuerySchema = z.object({
  queryText: z.string().min(1),
  studentId: z.number().optional().nullable(),
  context: z.object({
    studentLevel: z.string().optional(),
    instrument: z.string().optional(),
    currentLesson: z.string().optional(),
  }).optional(),
});
```

Add the route before the `export default router` line:

```typescript
/**
 * POST /api/ai/copilot
 * Teacher copilot AI assistant — answers questions, suggests exercises, returns resources
 * SECURITY: Teachers and owners only
 */
router.post("/copilot", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
  try {
    const data = copilotQuerySchema.parse(req.body);
    const teacherId = req.user!.id;

    // Enrich context with student data if studentId provided
    let context = data.context || {};
    if (data.studentId) {
      const student = await storage.getStudent(data.studentId);
      if (student) {
        context = {
          ...context,
          studentLevel: context.studentLevel || (student as any).level || "Beginner",
          instrument: context.instrument || (student as any).instrument || "Piano",
        };
      }
    }

    const response = await teacherCopilot.processQuery({
      teacherId,
      studentId: data.studentId ?? undefined,
      queryText: data.queryText,
      context,
    });

    res.json({
      success: true,
      response,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Teacher copilot error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to process copilot query",
    });
  }
});
```

Also update the `/status` route to include `copilot`:
```typescript
// In the /status handler, add to services object:
copilot: hasOpenAI,
```

- [ ] **Step 5: TypeScript check**

```bash
npm run check
```

Expected: 0 errors (or only pre-existing errors unrelated to this task).

- [ ] **Step 6: Run integration tests**

```bash
npm run test:integration -- --testNamePattern="Teacher Copilot"
```

Expected: both tests pass. The first test returns 200 with a valid response (either real OpenAI or fallback if no API key in test env).

- [ ] **Step 7: Run full test suite**

```bash
npm run test:integration
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add server/routes/ai-services.ts tests/integration/crud-operations.test.js
git commit -m "feat(ai): add teacher copilot route POST /api/ai/copilot"
```

---

## Chunk 2: Final CI

### Task 2: Full CI verification

- [ ] **Step 1: Run CI**

```bash
npm run ci
```

Expected: all steps green.

- [ ] **Step 2: Commit if any fixes needed**

```bash
git add -p
git commit -m "fix(ai): CI fixes for teacher copilot"
```
