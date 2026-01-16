import { db } from './db';
import { achievementDefinitions } from '@shared/schema';

export async function seedAchievements() {
  try {
    // Check if achievements already exist
    const existingAchievements = await db.select().from(achievementDefinitions).limit(1);
    if (existingAchievements.length > 0) {
      console.log('Achievement definitions already exist, skipping seed...');
      return;
    }

    console.log('Seeding achievement definitions...');

    const achievements = [
      // Lesson Completion Achievements
      {
        name: "First Steps",
        description: "Complete your first lesson",
        type: "lesson_completion",
        criteria: JSON.stringify({ lessonCount: 1 }),
        iconName: "music",
        badgeColor: "bronze",
        xpValue: 10
      },
      {
        name: "Learning Stride",
        description: "Complete 5 lessons",
        type: "lesson_completion", 
        criteria: JSON.stringify({ lessonCount: 5 }),
        iconName: "book",
        badgeColor: "silver",
        xpValue: 25
      },
      {
        name: "Knowledge Seeker",
        description: "Complete 10 lessons",
        type: "lesson_completion",
        criteria: JSON.stringify({ lessonCount: 10 }),
        iconName: "trophy",
        badgeColor: "gold",
        xpValue: 50
      },
      {
        name: "Master Student",
        description: "Complete 25 lessons",
        type: "lesson_completion",
        criteria: JSON.stringify({ lessonCount: 25 }),
        iconName: "crown",
        badgeColor: "purple",
        xpValue: 100
      },

      // Practice Streak Achievements
      {
        name: "Daily Dedication",
        description: "Practice 3 days in a row",
        type: "practice_streak",
        criteria: JSON.stringify({ streakDays: 3 }),
        iconName: "zap",
        badgeColor: "green",
        xpValue: 15
      },
      {
        name: "Weekly Warrior",
        description: "Practice 7 days in a row",
        type: "practice_streak",
        criteria: JSON.stringify({ streakDays: 7 }),
        iconName: "star",
        badgeColor: "blue",
        xpValue: 35
      },
      {
        name: "Practice Pro",
        description: "Practice 14 days in a row",
        type: "practice_streak",
        criteria: JSON.stringify({ streakDays: 14 }),
        iconName: "medal",
        badgeColor: "gold",
        xpValue: 75
      },
      {
        name: "Unstoppable",
        description: "Practice 30 days in a row",
        type: "practice_streak",
        criteria: JSON.stringify({ streakDays: 30 }),
        iconName: "sparkles",
        badgeColor: "purple",
        xpValue: 150
      },

      // Assignment Completion Achievements
      {
        name: "Task Master",
        description: "Complete your first assignment",
        type: "assignment_completion",
        criteria: JSON.stringify({ assignmentCount: 1 }),
        iconName: "check",
        badgeColor: "green",
        xpValue: 20
      },
      {
        name: "Assignment Ace",
        description: "Complete 5 assignments",
        type: "assignment_completion",
        criteria: JSON.stringify({ assignmentCount: 5 }),
        iconName: "target",
        badgeColor: "blue",
        xpValue: 40
      },
      {
        name: "Homework Hero",
        description: "Complete 15 assignments",
        type: "assignment_completion",
        criteria: JSON.stringify({ assignmentCount: 15 }),
        iconName: "award",
        badgeColor: "gold",
        xpValue: 80
      },

      // Session Attendance Achievements
      {
        name: "Present and Ready",
        description: "Attend your first lesson session",
        type: "session_attendance",
        criteria: JSON.stringify({ sessionCount: 1 }),
        iconName: "calendar",
        badgeColor: "bronze",
        xpValue: 15
      },
      {
        name: "Regular Attendee",
        description: "Attend 10 lesson sessions",
        type: "session_attendance",
        criteria: JSON.stringify({ sessionCount: 10 }),
        iconName: "users",
        badgeColor: "silver",
        xpValue: 50
      },
      {
        name: "Commitment Champion",
        description: "Attend 25 lesson sessions",
        type: "session_attendance",
        criteria: JSON.stringify({ sessionCount: 25 }),
        iconName: "crown",
        badgeColor: "gold",
        xpValue: 100
      },

      // Skill Progress Achievements
      {
        name: "Beginner's Luck",
        description: "Master 3 beginner-level songs",
        type: "skill_progress",
        criteria: JSON.stringify({ skillLevel: "beginner", songCount: 3 }),
        iconName: "music",
        badgeColor: "green",
        xpValue: 30
      },
      {
        name: "Intermediate Explorer",
        description: "Master 5 intermediate-level songs",
        type: "skill_progress",
        criteria: JSON.stringify({ skillLevel: "intermediate", songCount: 5 }),
        iconName: "trending",
        badgeColor: "blue",
        xpValue: 60
      },
      {
        name: "Advanced Virtuoso",
        description: "Master 3 advanced-level songs",
        type: "skill_progress",
        criteria: JSON.stringify({ skillLevel: "advanced", songCount: 3 }),
        iconName: "star",
        badgeColor: "purple",
        xpValue: 120
      },

      // Time-based Achievements
      {
        name: "Quick Learner",
        description: "Complete a lesson in under 30 minutes",
        type: "lesson_completion",
        criteria: JSON.stringify({ maxDuration: 30 }),
        iconName: "clock",
        badgeColor: "silver",
        xpValue: 25
      },
      {
        name: "Marathon Musician",
        description: "Practice for 2 hours in a single session",
        type: "practice_streak",
        criteria: JSON.stringify({ sessionDuration: 120 }),
        iconName: "volume",
        badgeColor: "gold",
        xpValue: 40
      }
    ];

    // Insert achievement definitions
    await db.insert(achievementDefinitions).values(achievements);
    
    console.log(`Successfully seeded ${achievements.length} achievement definitions!`);
  } catch (error) {
    console.error('Error seeding achievements:', error);
  }
}