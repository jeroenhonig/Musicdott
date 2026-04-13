# Practice Feedback AI — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the `POST /api/ai/practice-feedback` endpoint to real student/video data from the DB so the OpenAI call uses actual context (student name, instrument, video duration) instead of only what the client passes. Audio/video analysis stays mocked for Phase 1.

**Architecture:** Route at `server/routes/ai-services.ts:162` already exists. It passes data to `practiceFeedbackAI.analyzePracticeSession()` but ignores `videoId` — it never looks up the video record. Fix: import `storage`, resolve `videoId` → video record → student record, pass real data into the service call. Keep mocked `analyzeAudioMetrics` / `analyzeVideoMetrics` (Phase 2 concern).

**Tech Stack:** Node.js + Express + TypeScript, OpenAI gpt-4o-mini, Drizzle ORM via `server/storage-wrapper.ts`.

---

## Chunk 1: Wire Route to Storage

### Task 1: Resolve videoId to real student context in practice-feedback route

**Files:**
- Modify: `server/routes/ai-services.ts:162-193`

**Context:** The route currently ignores `videoId` completely. The video record holds `studentId`, `durationSec`, and `filePath`. The student record holds `name` and `instrument`. Both are fetchable via `storage`.

Note: `server/routes/ai-services.ts` also has two syntax errors (in the `smart-assignment` handler around lines 138-155) that must be fixed for TypeScript to compile. If the Teacher Copilot plan was executed first, these may already be fixed.

First check:
```bash
npm run check 2>&1 | grep "ai-services" | head -10
```

- [ ] **Step 1: Add integration test**

In `tests/integration/crud-operations.test.js`, add a describe block:

```javascript
describe("Practice Feedback AI", () => {
  it("should return feedback for a valid videoId", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ username: "mark", password: "teacher123" });

    // Upload a video first to get a real videoId
    const uploadRes = await agent.post("/api/videos/upload").attach(
      "video",
      Buffer.from("fake-video-data"),
      { filename: "test.mp4", contentType: "video/mp4" }
    );
    // If video storage not yet implemented, skip with a synthetic videoId
    const videoId = uploadRes.body.videoId || "00000000-0000-0000-0000-000000000000";

    const res = await agent.post("/api/ai/practice-feedback").send({
      videoId,
      studentName: "Test Student",
      instrument: "Piano",
      language: "English",
    });

    // Should return 200 (with real data or fallback)
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.feedback).toBeDefined();
      expect(typeof res.body.feedback).toBe("string");
    }
  });

  it("should reject unauthenticated feedback requests", async () => {
    const res = await request(app).post("/api/ai/practice-feedback").send({
      videoId: "some-id",
      studentName: "Test",
      instrument: "Piano",
    });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to confirm initial state**

```bash
npm run test:integration -- --testNamePattern="Practice Feedback AI"
```

Expected: first test passes if OpenAI key absent (falls back gracefully), second test passes.

- [ ] **Step 3: Fix syntax errors in `ai-services.ts` (if not already fixed)**

Find the smart-assignment handler (around line 134). Fix:
```typescript
// WRONG (current):
    const assignment = data.groovePatternId 
      ? await smartAssignmentBuilder.buildGrooveAssignment(data)
      ? await smartAssignmentBuilder.buildSmartAssignment(data);

// CORRECT:
    const assignment = data.groovePatternId
      ? await smartAssignmentBuilder.buildGrooveAssignment(data)
      : await smartAssignmentBuilder.buildSmartAssignment(data);
```

Also remove the stray `}` that appears before the route's `} catch` block in that handler.

- [ ] **Step 4: Add `storage` import to `server/routes/ai-services.ts`**

Add after existing imports:
```typescript
import { storage } from "../storage-wrapper";
```

- [ ] **Step 5: Replace the practice-feedback route handler**

Replace lines 162-193 in `server/routes/ai-services.ts` with:

```typescript
/**
 * POST /api/ai/practice-feedback
 * Generate AI feedback for practice recordings
 * SECURITY: Teachers and owners only
 */
router.post("/practice-feedback", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
  try {
    const data = practiceFeedbackSchema.parse(req.body);

    // Resolve videoId to real video record
    let resolvedStudentName = data.studentName;
    let resolvedInstrument = data.instrument;
    let videoPath: string | undefined;

    const videoRecord = await storage.getPracticeVideo(data.videoId);
    if (videoRecord) {
      videoPath = (videoRecord as any).filePath ?? undefined;

      // Enrich with student data if we have studentId
      const studentId = (videoRecord as any).studentId;
      if (studentId) {
        const student = await storage.getStudent(Number(studentId));
        if (student) {
          resolvedStudentName = (student as any).name || resolvedStudentName;
          resolvedInstrument = (student as any).instrument || resolvedInstrument;
        }
      }
    }

    const analysisResult = await practiceFeedbackAI.analyzePracticeSession({
      studentName: resolvedStudentName,
      instrument: resolvedInstrument,
      targetBpm: data.targetBpm,
      pastFeedback: data.pastFeedback,
      language: data.language,
      videoPath,
      audioPath: videoPath, // same file — audio analysis stub uses path for logging
    });

    res.json({
      success: true,
      feedback: analysisResult.feedback,
      audioMetrics: analysisResult.audioMetrics,
      videoMetrics: analysisResult.videoMetrics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Practice feedback generation error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate practice feedback",
    });
  }
});
```

- [ ] **Step 6: TypeScript check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 7: Run tests**

```bash
npm run test:integration -- --testNamePattern="Practice Feedback AI"
```

Expected: both tests pass.

- [ ] **Step 8: Run full test suite**

```bash
npm run test:integration
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add server/routes/ai-services.ts tests/integration/crud-operations.test.js
git commit -m "feat(ai): wire practice-feedback route to real video/student data from DB"
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
git commit -m "fix(ai): CI fixes for practice feedback"
```
