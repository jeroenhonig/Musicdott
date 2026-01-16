/**
 * Gamification API Routes
 */

import { Router } from "express";
import { gamificationService } from "../gamification/gamification-service";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Award points for an event
router.post("/events", requireAuth, async (req, res) => {
  try {
    const { ruleKey, idempotencyKey, proofAssetId, metadata } = req.body;
    const userId = req.user?.id.toString();
    
    if (!userId || !ruleKey || !idempotencyKey) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: userId, ruleKey, idempotencyKey" 
      });
    }

    const result = await gamificationService.awardPoints({
      userId,
      studioId: req.user?.schoolId?.toString() || "1",
      ruleKey,
      points: 0, // Will be set by service based on rule
      idempotencyKey,
      proofAssetId,
      metadata
    });

    res.json(result);
  } catch (error) {
    console.error("Error awarding points:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});

// Get student's gamification summary
router.get("/me/summary", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id.toString();
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const progress = await gamificationService.getStudentProgress(userId);
    res.json(progress);
  } catch (error) {
    console.error("Error getting student progress:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get class leaderboard (teachers only)
router.get("/classes/:classId/leaderboard", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "teacher" && req.user?.role !== "school_owner") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { classId } = req.params;
    const { range = "7d" } = req.query;
    
    const leaderboard = await gamificationService.getClassLeaderboard(
      classId, 
      range as '7d' | '30d'
    );
    
    res.json(leaderboard);
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user gamification stats
router.get("/user-stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id.toString();
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userStats = await gamificationService.getUserStats(userId);
    res.json(userStats);
  } catch (error) {
    console.error("Error getting user stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Teacher manual award
router.post("/teachers/award", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "teacher" && req.user?.role !== "school_owner") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { studentId, points, reason } = req.body;
    const teacherId = req.user.id.toString();

    if (!studentId || !points || !reason) {
      return res.status(400).json({ 
        message: "Missing required fields: studentId, points, reason" 
      });
    }

    const success = await gamificationService.teacherAward(
      teacherId, 
      studentId, 
      points, 
      reason
    );

    if (success) {
      res.json({ success: true, message: "Points awarded successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to award points" });
    }
  } catch (error) {
    console.error("Error with teacher award:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Redeem reward with points
router.post("/rewards/redeem", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id.toString();
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { rewardId, pointsCost } = req.body;
    
    if (!rewardId || !pointsCost) {
      return res.status(400).json({ 
        message: "Missing required fields: rewardId, pointsCost" 
      });
    }

    // Get current user points
    const progress = await gamificationService.getStudentProgress(userId);
    
    if (!progress || progress.totalPoints < pointsCost) {
      return res.status(400).json({ 
        message: "Insufficient points",
        currentPoints: progress?.totalPoints || 0,
        required: pointsCost
      });
    }

    // Deduct points by creating a negative point event
    const result = await gamificationService.awardPoints({
      userId,
      studioId: req.user?.schoolId?.toString() || "1",
      ruleKey: "reward_redemption",
      points: -pointsCost,
      idempotencyKey: `reward-${rewardId}-${Date.now()}`,
      metadata: { rewardId, rewardType: "store_redemption" }
    });

    if (result.success) {
      console.log(`User ${userId} redeemed reward ${rewardId} for ${pointsCost} points`);
      res.json({ 
        success: true, 
        message: "Reward redeemed successfully",
        rewardId,
        pointsDeducted: pointsCost,
        newBalance: progress.totalPoints - pointsCost
      });
    } else {
      res.status(500).json({ success: false, message: "Failed to redeem reward" });
    }
  } catch (error) {
    console.error("Error redeeming reward:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user's redeemed rewards
router.get("/rewards/history", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id.toString();
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // For now, return empty array - can be expanded later to track redemption history
    res.json({ 
      rewards: [],
      message: "Rewards history tracking coming soon" 
    });
  } catch (error) {
    console.error("Error getting rewards history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;