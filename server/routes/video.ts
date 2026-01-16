/**
 * Video Upload and Processing Routes
 */

import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { 
  loadSchoolContext, 
  requireTeacherOrOwner, 
  requireCustomAccess 
} from "../middleware/authz";
import { storage } from "../storage-wrapper";

const router = Router();

// Configure multer for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/webm', 'video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// Video ownership validation middleware
const requireVideoAccess = requireCustomAccess(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) return true; // For upload endpoints, no videoId to check
  
  try {
    // Check if video exists and user has access
    const video = await storage.getPracticeVideo(videoId);
    if (!video) return false;
    
    // Platform owners have full access
    if (req.school!.isPlatformOwner()) return true;
    
    // School owners can access all videos in their school
    if (req.school!.isSchoolOwner() && req.school!.canAccessSchool(parseInt(video.studioId))) {
      return true;
    }
    
    // Teachers can access videos in their school
    if (req.school!.isTeacher() && req.school!.canAccessSchool(parseInt(video.studioId))) {
      return true;
    }
    
    // Students can only access their own videos
    if (req.school!.isStudent() && video.studentId === req.user!.id.toString()) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Video access check error:', error);
    return false;
  }
});

// Upload practice video - SECURE: Authentication + School context + Role validation
router.post("/upload", requireAuth, loadSchoolContext, requireTeacherOrOwner(), upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file provided" });
    }

    const { assignmentId } = req.body;
    const userId = req.user?.id?.toString();
    
    if (!userId || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // In a real implementation, this would:
    // 1. Upload to S3 or similar storage
    // 2. Generate thumbnail
    // 3. Process video metadata
    // 4. Store in database
    
    // For now, simulate successful upload
    const videoId = `video_${userId}_${Date.now()}`;
    const videoUrl = `/api/videos/stream/${videoId}`;

    // SECURE: Create video record with proper school scoping
    const videoRecord = {
      id: videoId,
      studioId: req.school!.id.toString(), // Use authenticated school context
      studentId: userId,
      assignmentId: assignmentId || null,
      assetId: videoId,
      durationSec: Math.floor(Math.random() * 180) + 30, // 30-210 seconds
      status: "ready",
      url: videoUrl,
      createdAt: new Date().toISOString()
    };
    
    // TODO: Store video record in database with proper school scoping
    // await storage.createPracticeVideo(videoRecord);

    res.json({
      success: true,
      videoId,
      url: videoUrl,
      message: "Video uploaded successfully"
    });

  } catch (error) {
    console.error("Video upload error:", error);
    res.status(500).json({ 
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload video" 
    });
  }
});

// Stream video content - SECURE: Authentication + School context + Video ownership
router.get("/stream/:videoId", requireAuth, loadSchoolContext, requireVideoAccess, (req, res) => {
  const { videoId } = req.params;
  
  // In production, this would stream from S3 or similar
  // For now, return a placeholder response
  res.status(404).json({ 
    message: "Video streaming not implemented in development mode" 
  });
});

// Get video thumbnail - SECURE: Authentication + School context + Video ownership
router.get("/thumbnail/:videoId", requireAuth, loadSchoolContext, requireVideoAccess, (req, res) => {
  const { videoId } = req.params;
  
  // In production, this would return generated thumbnail
  res.status(404).json({ 
    message: "Thumbnail generation not implemented in development mode" 
  });
});

// Get video comments/annotations - SECURE: Authentication + School context + Video ownership
router.get("/:videoId/comments", requireAuth, loadSchoolContext, requireVideoAccess, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Mock video comments for demonstration
    const comments = [
      {
        id: "1",
        videoId,
        authorId: "teacher_1",
        authorName: "Your Teacher",
        atMs: 15000, // 15 seconds
        body: "Great timing here! Keep it steady.",
        kind: "comment",
        createdAt: new Date().toISOString()
      },
      {
        id: "2",
        videoId,
        authorId: "teacher_1", 
        authorName: "Your Teacher",
        atMs: 45000, // 45 seconds
        body: "Try to hit the snare a bit harder in this section",
        kind: "comment",
        createdAt: new Date().toISOString()
      }
    ];

    res.json(comments);
  } catch (error) {
    console.error("Error fetching video comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// Add video comment/annotation - SECURE: Authentication + School context + Video ownership
router.post("/:videoId/comments", requireAuth, loadSchoolContext, requireVideoAccess, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { atMs, body, kind = 'comment' } = req.body;
    const userId = req.user?.id?.toString();

    if (!userId || !req.user || !body || atMs === undefined) {
      return res.status(400).json({ 
        message: "Missing required fields: atMs, body" 
      });
    }

    // In production, save to database
    const comment = {
      id: `comment_${Date.now()}`,
      videoId,
      authorId: userId,
      authorName: req.user.name || req.user.username,
      atMs: parseInt(atMs),
      body,
      kind,
      createdAt: new Date().toISOString()
    };

    res.json(comment);
  } catch (error) {
    console.error("Error adding video comment:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

export default router;