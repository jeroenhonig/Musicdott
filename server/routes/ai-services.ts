/**
 * AI Services API Routes
 * Comprehensive AI features for MusicDott 2.0
 */

import { Request, Response, Router } from "express";
import { lessonRecapAI } from "../ai-services/lesson-recap-ai";
import { transcriptionAI } from "../ai-services/transcription-ai";
import { practiceFeedbackAI } from "../ai-services/practice-feedback-ai";
import { smartAssignmentBuilder } from "../ai-services/smart-assignment-builder";
import { requireAuth } from "../middleware/auth";
import { loadSchoolContext, requireTeacherOrOwner } from "../middleware/authz";
import { z } from "zod";

const router = Router();

// Validation schemas
const lessonRecapSchema = z.object({
  studentName: z.string(),
  instrument: z.string(),
  age: z.number().optional(),
  level: z.string(),
  lessonNotes: z.string(),
  studentLanguage: z.string().default('English'),
});

const practicePlanSchema = z.object({
  name: z.string(),
  instrument: z.string(),
  level: z.string(),
  minutesPerDay: z.number().default(15),
  practiceSummary: z.string().optional(),
  assignmentList: z.string().optional(),
  teacherGoals: z.string().optional(),
  language: z.string().default('English'),
});

const smartAssignmentSchema = z.object({
  teacherText: z.string(),
  instrument: z.string(),
  level: z.string(),
  language: z.string().default('English'),
  groovePatternId: z.string().optional(),
});

const practiceFeedbackSchema = z.object({
  videoId: z.string(),
  studentName: z.string(),
  instrument: z.string(),
  targetBpm: z.number().optional(),
  pastFeedback: z.string().optional(),
  language: z.string().default('English'),
});

/**
 * POST /api/ai/lesson-recap
 * Generate AI-powered lesson recap from teacher notes
 * SECURITY: Teachers and owners only
 */
router.post("/lesson-recap", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
  try {
    const data = lessonRecapSchema.parse(req.body);
    
    const recap = await lessonRecapAI.generateLessonRecap(data);
    
    res.json({
      success: true,
      recap,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Lesson recap generation error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate lesson recap",
    });
  }
});

/**
 * POST /api/ai/practice-plan
 * Generate personalized 7-day practice plan
 * SECURITY: Teachers and owners only
 */
router.post("/practice-plan", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
  try {
    const data = practicePlanSchema.parse(req.body);
    
    const plan = await lessonRecapAI.generatePracticeplan(data);
    
    res.json({
      success: true,
      plan,
      generatedAt: new Date().toISOString(),
      weekStart: new Date().toISOString().split('T')[0], // Today's date
    });
  } catch (error) {
    console.error("Practice plan generation error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate practice plan",
    });
  }
});

/**
 * POST /api/ai/weekly-challenges
 * Generate gamified weekly challenges
 * SECURITY: Teachers and owners only
 */
router.post("/weekly-challenges", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
  try {
    const studentData = req.body;
    
    const challenges = await lessonRecapAI.generateWeeklyChallenges(studentData);
    
    res.json({
      success: true,
      challenges,
      generatedAt: new Date().toISOString(),
      weekStart: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error("Weekly challenges generation error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate weekly challenges",
    });
  }
});

/**
 * POST /api/ai/smart-assignment
 * Generate comprehensive assignment from teacher description
 * SECURITY: Teachers and owners only
 */
router.post("/smart-assignment", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
  try {
    const data = smartAssignmentSchema.parse(req.body);
    
    const assignment = data.groovePatternId 
      ? await smartAssignmentBuilder.buildGrooveAssignment(data)
      : await smartAssignmentBuilder.buildSmartAssignment(data);
    
    res.json({
      success: true,
      assignment,
      generatedAt: new Date().toISOString(),
      generatedByAi: true,
    });
  } catch (error) {
    console.error("Smart assignment generation error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate assignment",
    });
  }
});

/**
 * POST /api/ai/practice-feedback
 * Generate AI feedback for practice recordings
 * SECURITY: Teachers and owners only
 */
router.post("/practice-feedback", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
  try {
    const data = practiceFeedbackSchema.parse(req.body);
    
    // In a real implementation, you would:
    // 1. Retrieve the video/audio file from storage
    // 2. Analyze it for metrics
    // 3. Generate feedback
    
    const analysisResult = await practiceFeedbackAI.analyzePracticeSession({
      studentName: data.studentName,
      instrument: data.instrument,
      targetBpm: data.targetBpm,
      pastFeedback: data.pastFeedback,
      language: data.language,
      // videoPath: would be resolved from videoId
      // audioPath: would be extracted from video
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

/**
 * POST /api/ai/transcribe-media
 * Transcribe and translate media files
 * SECURITY: Teachers and owners only
 */
router.post("/transcribe-media", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
  try {
    const { filePath, targetLanguages = ['en'] } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: "File path is required" });
    }
    
    const result = await transcriptionAI.processMediaForCaptions(filePath, targetLanguages);
    
    res.json({
      success: true,
      originalTranscript: result.originalTranscript,
      translations: result.translations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Media transcription error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to transcribe media",
    });
  }
});

/**
 * GET /api/ai/status
 * Check AI services availability
 * SECURITY: Teachers and owners only
 */
router.get("/status", requireAuth, loadSchoolContext, requireTeacherOrOwner(), (req: Request, res: Response) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  
  res.json({
    services: {
      lessonRecap: hasOpenAI,
      transcription: hasOpenAI,
      practiceFeedback: hasOpenAI,
      smartAssignment: hasOpenAI,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/ai/dashboard-summary
 * Generate AI dashboard summary for user
 * SECURITY: Teachers and owners only
 */
router.get("/dashboard-summary", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // For now, return a basic summary - in a full implementation this would use AI
    const dashboardSummary = {
      welcomeMessage: `Welcome back! You have new activities waiting.`,
      todayHighlights: [
        "3 students have upcoming lessons today",
        "2 new practice recordings to review",
        "Weekly progress reports are ready"
      ],
      suggestions: [
        "Review John's practice session from yesterday",
        "Prepare materials for today's 3:00 PM lesson",
        "Check out the new groove patterns added this week"
      ],
      quickStats: {
        lessonsToday: 3,
        pendingReviews: 2,
        weeklyProgress: 85
      },
      generatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      summary: dashboardSummary
    });
  } catch (error) {
    console.error("Error generating dashboard summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate dashboard summary",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;