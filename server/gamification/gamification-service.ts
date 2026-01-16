/**
 * MusicDott 2.0 Gamification Service
 * Handles points, streaks, badges, and leaderboards
 */

import { storage } from "../storage-wrapper";

export interface PointRule {
  key: string;
  points: number;
  maxPerDay?: number;
  requiresProof?: boolean;
  metadata?: any;
}

export interface PointEvent {
  userId: string;
  studioId: string;
  ruleKey: string;
  points: number;
  idempotencyKey: string;
  proofAssetId?: string;
  createdBy?: string;
  metadata?: any;
}

export interface StudentProgress {
  userId: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  recentActivity: PointEvent[];
}

export class GamificationService {
  private pointRules: Map<string, PointRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    // Default point rules from your specification
    const defaultRules: PointRule[] = [
      {
        key: "timer.minute_logged",
        points: 1,
        maxPerDay: 120,
        requiresProof: false,
        metadata: { description: "Practice time logging" }
      },
      {
        key: "assignment.completed",
        points: 50,
        requiresProof: true,
        metadata: { description: "Complete assignment with evidence" }
      },
      {
        key: "video.submitted",
        points: 25,
        requiresProof: true,
        metadata: { description: "Submit practice video" }
      },
      {
        key: "lesson.completed",
        points: 30,
        requiresProof: false,
        metadata: { description: "Complete lesson content" }
      },
      {
        key: "daily.practice",
        points: 10,
        maxPerDay: 10,
        requiresProof: false,
        metadata: { description: "Daily practice bonus" }
      }
    ];

    defaultRules.forEach(rule => {
      this.pointRules.set(rule.key, rule);
    });
  }

  // Award points for an event
  async awardPoints(event: PointEvent): Promise<{ success: boolean; pointsAwarded: number; message: string }> {
    try {
      const rule = this.pointRules.get(event.ruleKey);
      if (!rule) {
        return { success: false, pointsAwarded: 0, message: `Unknown rule: ${event.ruleKey}` };
      }

      // Check daily limits
      if (rule.maxPerDay) {
        const todayPoints = await this.getTodayPoints(event.userId, event.ruleKey);
        if (todayPoints >= rule.maxPerDay) {
          return { 
            success: false, 
            pointsAwarded: 0, 
            message: `Daily limit reached for ${event.ruleKey} (${rule.maxPerDay} points)` 
          };
        }
      }

      // Check proof requirement
      if (rule.requiresProof && !event.proofAssetId) {
        return { 
          success: false, 
          pointsAwarded: 0, 
          message: `Proof required for ${event.ruleKey}` 
        };
      }

      // Award points (simulate database write)
      const pointEvent = {
        ...event,
        points: rule.points,
        occurredAt: new Date(),
      };

      // Update streak for practice-related events
      if (event.ruleKey.includes('practice') || event.ruleKey.includes('timer')) {
        await this.updateStreak(event.userId);
      }

      // Check for badge achievements
      await this.checkBadgeAchievements(event.userId);

      return { 
        success: true, 
        pointsAwarded: rule.points, 
        message: `Awarded ${rule.points} points for ${event.ruleKey}` 
      };

    } catch (error) {
      console.error('Error awarding points:', error);
      return { success: false, pointsAwarded: 0, message: 'Failed to award points' };
    }
  }

  // Get user stats (alias for getStudentProgress for API compatibility)
  async getUserStats(userId: string): Promise<StudentProgress> {
    return this.getStudentProgress(userId);
  }

  // Get student progress summary
  async getStudentProgress(userId: string): Promise<StudentProgress> {
    try {
      // Simulate getting data from storage
      const totalPoints = Math.floor(Math.random() * 1000) + 100; // Mock data
      const currentStreak = Math.floor(Math.random() * 30) + 1;
      const longestStreak = Math.max(currentStreak, Math.floor(Math.random() * 50) + 10);
      
      const badges = [];
      if (currentStreak >= 7) badges.push('first_7_day_streak');
      if (currentStreak >= 30) badges.push('iron_focus');
      if (totalPoints >= 500) badges.push('practice_warrior');

      return {
        userId,
        totalPoints,
        currentStreak,
        longestStreak,
        badges,
        recentActivity: []
      };
    } catch (error) {
      console.error('Error getting student progress:', error);
      return {
        userId,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        badges: [],
        recentActivity: []
      };
    }
  }

  // Get class leaderboard
  async getClassLeaderboard(classId: string, timeRange: '7d' | '30d' = '7d'): Promise<any[]> {
    try {
      // Mock leaderboard data - in production this would query the database
      const mockLeaderboard = [
        { studentId: '1', name: 'Sarah Johnson', points: 450, streak: 12, change: '+5' },
        { studentId: '2', name: 'Mike Chen', points: 380, streak: 8, change: '+2' },
        { studentId: '3', name: 'Emma Wilson', points: 320, streak: 15, change: '-1' },
        { studentId: '4', name: 'Jake Thompson', points: 290, streak: 6, change: '+3' },
        { studentId: '5', name: 'Lisa Park', points: 250, streak: 4, change: '0' }
      ];

      return mockLeaderboard;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  private async getTodayPoints(userId: string, ruleKey: string): Promise<number> {
    // Simulate checking today's points for this rule
    return Math.floor(Math.random() * 50);
  }

  private async updateStreak(userId: string): Promise<void> {
    // Update streak logic - check if user practiced yesterday
    // If gap > 1 day, check for grace tokens
    // Implementation would update the streaks table
  }

  private async checkBadgeAchievements(userId: string): Promise<void> {
    // Check all badge conditions and award new badges
    const progress = await this.getStudentProgress(userId);
    
    // Example badge conditions
    const badgeConditions = [
      { key: 'first_7_day_streak', condition: () => progress.currentStreak >= 7 },
      { key: 'iron_focus', condition: () => progress.currentStreak >= 30 },
      { key: 'practice_warrior', condition: () => progress.totalPoints >= 500 },
    ];

    for (const badge of badgeConditions) {
      if (badge.condition() && !progress.badges.includes(badge.key)) {
        // Award badge
        console.log(`🏆 Badge earned: ${badge.key} for user ${userId}`);
      }
    }
  }

  // Manual teacher award
  async teacherAward(teacherId: string, studentId: string, points: number, reason: string): Promise<boolean> {
    try {
      const event: PointEvent = {
        userId: studentId,
        studioId: '1', // Would get from teacher's studio
        ruleKey: 'teacher.manual_award',
        points,
        idempotencyKey: `teacher_${teacherId}_${Date.now()}`,
        createdBy: teacherId,
        metadata: { reason }
      };

      const result = await this.awardPoints(event);
      return result.success;
    } catch (error) {
      console.error('Error with teacher award:', error);
      return false;
    }
  }
}

export const gamificationService = new GamificationService();