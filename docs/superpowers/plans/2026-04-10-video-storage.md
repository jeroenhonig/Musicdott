# Video Storage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up practice video and comment persistence to PostgreSQL so that uploaded videos and teacher annotations are actually saved and retrievable.

**Architecture:** The schema (`practiceVideos`, `videoComments` in `shared/schema.ts`) and storage interface (`server/storage-wrapper.ts`) already exist. The missing pieces are: (1) real Drizzle queries in `server/database-storage.ts`, (2) local file storage for video files (no S3 — use `uploads/videos/` directory), and (3) uncommenting the `createPracticeVideo` call in `server/routes/video.ts`. The video ID mismatch (route generates string IDs like `video_123_456`, schema expects UUID) is fixed by letting Drizzle generate the UUID and returning it.

**Tech Stack:** Node.js + Express + TypeScript, Drizzle ORM + PostgreSQL, multer (already configured), `shared/schema.ts` practiceVideos/videoComments tables, `fs/promises` for local file writes.

---

## Chunk 1: DB Layer

### Task 1: Add DB migration for video tables

**Files:**
- Create: `server/migrations/sql/004_practice_videos.sql`

**Context:** The `practiceVideos` and `videoComments` tables are defined in `shared/schema.ts` but were never added to any migration file. Check with:
```bash
grep -r "practice_videos\|video_comments" server/migrations/sql/
```
If they already exist in a migration, skip this task and commit nothing.

- [ ] **Step 1: Create migration**

```sql
-- Migration: 004_practice_videos
CREATE TABLE IF NOT EXISTS practice_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL,
  student_id UUID NOT NULL,
  assignment_id UUID,
  asset_id UUID NOT NULL,
  duration_sec INTEGER,
  status TEXT NOT NULL DEFAULT 'processing',
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES practice_videos(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  at_ms INTEGER NOT NULL,
  body TEXT NOT NULL,
  kind TEXT DEFAULT 'comment',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_videos_student ON practice_videos(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_videos_studio ON practice_videos(studio_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_video ON video_comments(video_id);
```

- [ ] **Step 2: Commit**

```bash
git add server/migrations/sql/004_practice_videos.sql
git commit -m "feat(video): add practice_videos and video_comments migration"
```

---

### Task 2: Implement video DB methods in `DatabaseStorage`

**Files:**
- Modify: `server/database-storage.ts:1330-1342`

**Context:** All video methods in `database-storage.ts` are one-liner stubs that return mock data (lines 1330-1342). The `practiceVideos` and `videoComments` tables + their Drizzle types are in `shared/schema.ts`.

First check what's imported at the top of `database-storage.ts`:
```bash
grep "practiceVideos\|videoComments\|practice_videos" server/database-storage.ts | head -5
```
Add imports if missing.

- [ ] **Step 1: Add integration test**

In `tests/integration/crud-operations.test.js`, add a new describe block:

```javascript
describe("Practice Videos", () => {
  it("should create and retrieve a practice video", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ username: "mark", password: "teacher123" });

    // Create via storage directly through the API
    const createRes = await agent.post("/api/videos/upload").attach(
      "video",
      Buffer.from("fake-video-data"),
      { filename: "test.mp4", contentType: "video/mp4" }
    );
    expect(createRes.status).toBe(200);
    expect(createRes.body.videoId).toBeDefined();
  });

  it("should create and retrieve video comments", async () => {
    const agent = request.agent(app);
    await agent.post("/api/login").send({ username: "mark", password: "teacher123" });

    // First upload a video
    const uploadRes = await agent.post("/api/videos/upload").attach(
      "video",
      Buffer.from("fake-video-data"),
      { filename: "test.mp4", contentType: "video/mp4" }
    );
    const videoId = uploadRes.body.videoId;

    // Add comment
    const commentRes = await agent
      .post(`/api/videos/${videoId}/comments`)
      .send({ atMs: 5000, body: "Good timing here!", kind: "comment" });
    expect(commentRes.status).toBe(200);
    expect(commentRes.body.id).toBeDefined();
    expect(commentRes.body.body).toBe("Good timing here!");

    // Retrieve comments
    const getRes = await agent.get(`/api/videos/${videoId}/comments`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.length).toBeGreaterThan(0);
    expect(getRes.body[0].body).toBe("Good timing here!");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:integration -- --testNamePattern="Practice Videos"
```
Expected: The comment test fails — comments route returns hardcoded mock data and doesn't persist.

- [ ] **Step 3: Replace the stub block in `database-storage.ts`**

Find the stub block at lines 1330-1342 and replace with real implementations. First read the imports at the top of the file to confirm `practiceVideos` and `videoComments` are imported from `@shared/schema`. If not, add them to the import.

Replace lines 1330-1342 with:

```typescript
// Practice video methods — fully wired to PostgreSQL
async getPracticeVideo(videoId: string): Promise<any | undefined> {
  try {
    const [video] = await db
      .select()
      .from(practiceVideos)
      .where(eq(practiceVideos.id, videoId));
    return video;
  } catch {
    return undefined;
  }
}

async getPracticeVideos(userId: number): Promise<any[]> {
  try {
    return db
      .select()
      .from(practiceVideos)
      .where(eq(practiceVideos.studentId, String(userId)))
      .orderBy(desc(practiceVideos.createdAt));
  } catch {
    return [];
  }
}

async getPracticeVideosBySchool(schoolId: number): Promise<any[]> {
  try {
    return db
      .select()
      .from(practiceVideos)
      .where(eq(practiceVideos.studioId, String(schoolId)))
      .orderBy(desc(practiceVideos.createdAt));
  } catch {
    return [];
  }
}

async getStudentPracticeVideos(studentId: number): Promise<any[]> {
  return this.getPracticeVideos(studentId);
}

async createPracticeVideo(video: any): Promise<any> {
  const [newVideo] = await db
    .insert(practiceVideos)
    .values({
      studioId: String(video.studioId),
      studentId: String(video.studentId),
      assignmentId: video.assignmentId ? String(video.assignmentId) : null,
      assetId: video.assetId ?? video.id ?? crypto.randomUUID(),
      durationSec: video.durationSec ?? null,
      status: video.status ?? "ready",
      filePath: video.filePath ?? null,
    } as any)
    .returning();
  return newVideo;
}

async updatePracticeVideo(videoId: string, video: Partial<any>): Promise<any> {
  const [updated] = await db
    .update(practiceVideos)
    .set(video)
    .where(eq(practiceVideos.id, videoId))
    .returning();
  return updated;
}

async deletePracticeVideo(videoId: string): Promise<boolean> {
  await db.delete(practiceVideos).where(eq(practiceVideos.id, videoId));
  return true;
}

async getVideoComments(videoId: string): Promise<any[]> {
  try {
    return db
      .select()
      .from(videoComments)
      .where(eq(videoComments.videoId, videoId))
      .orderBy(videoComments.atMs);
  } catch {
    return [];
  }
}

async createVideoComment(comment: any): Promise<any> {
  const [newComment] = await db
    .insert(videoComments)
    .values({
      videoId: String(comment.videoId),
      authorId: String(comment.authorId),
      atMs: comment.atMs,
      body: comment.body,
      kind: comment.kind ?? "comment",
    })
    .returning();
  return newComment;
}

async updateVideoComment(commentId: string, comment: Partial<any>): Promise<any> {
  const [updated] = await db
    .update(videoComments)
    .set(comment)
    .where(eq(videoComments.id, commentId))
    .returning();
  return updated;
}

async deleteVideoComment(commentId: string): Promise<boolean> {
  await db.delete(videoComments).where(eq(videoComments.id, commentId));
  return true;
}
```

Make sure `practiceVideos`, `videoComments` are imported from `@shared/schema` and `desc` is imported from `drizzle-orm`. Also add `import crypto from "crypto"` if not present (or use `randomUUID` from `node:crypto`).

Also add `filePath` to the schema if it's missing. Check:
```bash
grep "file_path\|filePath" shared/schema.ts | head
```
If `file_path` is not in `practiceVideos`, add it:
```typescript
filePath: text("file_path"),
```

- [ ] **Step 4: Run TypeScript check**

```bash
npm run check
```
Expected: 0 errors.

- [ ] **Step 5: Commit DB layer**

```bash
git add server/database-storage.ts shared/schema.ts
git commit -m "feat(video): implement practice video and comment DB methods"
```

---

## Chunk 2: Route Layer + Local File Storage

### Task 3: Wire upload route to DB + local file storage

**Files:**
- Modify: `server/routes/video.ts:68-122`

**Context:** The upload handler at line 69 generates a fake videoId and never saves the file. We want to: (1) write the file to `uploads/videos/` on disk, (2) call `storage.createPracticeVideo()` to persist the record, and (3) return the real UUID from the DB.

- [ ] **Step 1: Add `filePath` column to schema (if not already done in Task 2)**

```bash
grep "file_path\|filePath" shared/schema.ts | head
```
If missing, add to `practiceVideos` table in `shared/schema.ts`:
```typescript
filePath: text("file_path"),
```

- [ ] **Step 2: Rewrite the upload handler**

Replace lines 68-122 in `server/routes/video.ts`:

```typescript
import path from "path";
import fs from "fs/promises";

// Ensure upload directory exists
const VIDEO_UPLOAD_DIR = path.join(process.cwd(), "uploads", "videos");
fs.mkdir(VIDEO_UPLOAD_DIR, { recursive: true }).catch(() => {});

// Upload practice video
router.post("/upload", requireAuth, loadSchoolContext, requireTeacherOrOwner(), upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file provided" });
    }

    const { assignmentId } = req.body;
    const userId = req.user?.id;
    const schoolId = req.school?.id;

    if (!userId || !schoolId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Write file to disk
    const filename = `${Date.now()}-${userId}.${req.file.mimetype === 'video/webm' ? 'webm' : req.file.mimetype === 'video/quicktime' ? 'mov' : 'mp4'}`;
    const filePath = path.join(VIDEO_UPLOAD_DIR, filename);
    await fs.writeFile(filePath, req.file.buffer);

    // Persist video record in DB
    const videoRecord = await storage.createPracticeVideo({
      studioId: schoolId,
      studentId: userId,
      assignmentId: assignmentId || null,
      assetId: filename,
      filePath: `/uploads/videos/${filename}`,
      durationSec: null, // unknown without processing
      status: "ready",
    });

    res.json({
      success: true,
      videoId: videoRecord.id,
      url: `/api/videos/stream/${videoRecord.id}`,
      message: "Video uploaded successfully",
    });
  } catch (error) {
    console.error("Video upload error:", error);
    res.status(500).json({ success: false, message: "Failed to upload video" });
  }
});
```

Add `import path from "path"` and `import fs from "fs/promises"` at the top of the file.

- [ ] **Step 3: Wire comments route to DB**

Replace the GET `/:videoId/comments` handler (lines 146-179) to use real storage:

```typescript
router.get("/:videoId/comments", requireAuth, loadSchoolContext, requireVideoAccess, async (req, res) => {
  try {
    const comments = await storage.getVideoComments(req.params.videoId);
    res.json(comments);
  } catch (error) {
    console.error("Error fetching video comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});
```

Replace the POST `/:videoId/comments` handler (lines 182-210):

```typescript
router.post("/:videoId/comments", requireAuth, loadSchoolContext, requireVideoAccess, async (req, res) => {
  try {
    const { atMs, body, kind = 'comment' } = req.body;
    const userId = req.user?.id;

    if (!userId || !body || atMs === undefined) {
      return res.status(400).json({ message: "Missing required fields: atMs, body" });
    }

    const comment = await storage.createVideoComment({
      videoId: req.params.videoId,
      authorId: userId,
      atMs: parseInt(atMs),
      body,
      kind,
    });

    res.json(comment);
  } catch (error) {
    console.error("Error adding video comment:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
});
```

- [ ] **Step 4: TypeScript check**

```bash
npm run check
```
Expected: 0 errors.

- [ ] **Step 5: Run integration tests**

```bash
npm run test:integration
```
Expected: all 69+ tests pass including the new Practice Videos tests.

- [ ] **Step 6: Commit**

```bash
git add server/routes/video.ts
git commit -m "feat(video): wire upload and comments to DB + local file storage"
```

---

### Task 4: Serve uploaded video files

**Files:**
- Modify: `server/index.ts` or `server/routes.ts` (wherever static files are served)

**Context:** Files are now saved to `uploads/videos/` on disk. We need Express to serve them at `/uploads/videos/:filename`.

- [ ] **Step 1: Find where static files are served**

```bash
grep -n "express.static\|static(" server/index.ts server/routes.ts 2>/dev/null | head -10
```

- [ ] **Step 2: Add static file serving for uploads**

In `server/index.ts`, in the middleware setup section (after `app.use(express.json())` and similar), add:

```typescript
import path from "path";
// Serve uploaded video files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
```

If `path` is already imported, skip that line.

- [ ] **Step 3: Add `uploads/` to `.gitignore`**

```bash
grep "uploads" .gitignore || echo "\n# Uploaded files\nuploads/" >> .gitignore
```

- [ ] **Step 4: TypeScript check + tests**

```bash
npm run check && npm run test:integration
```

- [ ] **Step 5: Commit**

```bash
git add server/index.ts .gitignore
git commit -m "feat(video): serve uploaded video files via static middleware"
```

---

## Chunk 3: Final Verification

### Task 5: Run full CI

- [ ] **Step 1: Run full CI**

```bash
npm run ci
```
Expected: all steps green.

- [ ] **Step 2: Manual smoke test (if server accessible)**

```bash
# Start dev server
npm run dev &
sleep 3

# Login and get cookie
curl -s -c /tmp/md-cookie.txt -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5000" \
  -d '{"username":"mark","password":"teacher123"}' | jq .id

# Upload test video
curl -s -b /tmp/md-cookie.txt -X POST http://localhost:5000/api/videos/upload \
  -H "Origin: http://localhost:5000" \
  -F "video=@/dev/urandom;type=video/mp4" 2>/dev/null | head -c 200 || echo "(skipped — /dev/urandom is binary)"

# Better: test with a 1-byte mp4
echo -n '' > /tmp/test.mp4
curl -s -b /tmp/md-cookie.txt -X POST http://localhost:5000/api/videos/upload \
  -H "Origin: http://localhost:5000" \
  -F "video=@/tmp/test.mp4;type=video/mp4" | jq .videoId
```

Expected: returns a UUID videoId.
