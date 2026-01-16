/**
 * AI-powered lesson recap generation service
 * Phase 1: Automated Lesson Summaries + Instant Translation & Captions
 */

import { OpenAI } from "openai";
import type { User } from "@shared/schema";

interface LessonRecapData {
  studentName: string;
  instrument: string;
  age?: number;
  level: string;
  lessonNotes: string;
  studentLanguage: string;
}

interface LessonRecap {
  id: string;
  lessonId: string;
  studentId: string;
  rawNotes: string;
  recapText: string;
  generatedByAi: boolean;
  generatedAt: Date;
}

export class LessonRecapAI {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Generate AI-powered lesson recap from teacher's quick notes
   */
  async generateLessonRecap(data: LessonRecapData): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const systemPrompt = `You are Musicdott's teaching assistant. 
Your job is to turn a teacher's quick lesson notes into a short, clear, and motivating recap for a music student. 
- Keep it friendly, positive, and encouraging.
- Avoid technical overload unless explicitly mentioned.
- Use short paragraphs (2–3 sentences max).
- End with a simple practice suggestion for the week.`;

    const userPrompt = `STUDENT NAME: ${data.studentName}
INSTRUMENT: ${data.instrument}
AGE: ${data.age || 'Not specified'}
LEVEL: ${data.level}

TEACHER NOTES:
${data.lessonNotes}

Write the recap in ${data.studentLanguage}.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "Unable to generate recap at this time.";
    } catch (error) {
      console.error("Error generating lesson recap:", error);
      throw new Error("Failed to generate lesson recap. Please try again.");
    }
  }

  /**
   * Generate practice plan for student
   */
  async generatePracticeplan(studentData: any): Promise<any> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    const systemPrompt = `You are Musicdott's practice coach.
You receive student practice history, skill level, and current assignments.
You create a motivating 7-day practice plan that balances review and new skills.
Use clear, friendly language. Keep each day's plan under 50 words.
Include estimated minutes for each activity.`;

    const userPrompt = `STUDENT INFO:
Name: ${studentData.name}
Instrument: ${studentData.instrument}
Level: ${studentData.level}
Weekly availability: ${studentData.minutesPerDay || 15} min/day

ACTIVITY HISTORY:
${studentData.practiceSummary || 'New student - no previous data'}

CURRENT ASSIGNMENTS:
${studentData.assignmentList || 'No current assignments'}

TEACHER NOTES:
${studentData.teacherGoals || 'Focus on fundamentals and consistent practice'}

Generate the 7-day plan in ${studentData.language || 'English'}.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "Unable to generate practice plan at this time.";
    } catch (error) {
      console.error("Error generating practice plan:", error);
      throw new Error("Failed to generate practice plan. Please try again.");
    }
  }

  /**
   * Generate weekly challenges for gamification
   */
  async generateWeeklyChallenges(studentData: any): Promise<any[]> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    const systemPrompt = `You are a gamification coach for music students.
Your goal is to keep them practicing consistently.
You receive their practice data and choose 2–3 simple weekly challenges.
Challenges should be realistic but motivating, based on their current performance.
Output in JSON format with {title, description, reward_points}.`;

    const userPrompt = `STUDENT NAME: ${studentData.name}
Level: ${studentData.level}
Practice data (last 2 weeks):
${JSON.stringify(studentData.practiceStats || {})}

Recent achievements:
${JSON.stringify(studentData.recentBadges || [])}

Suggest 3 weekly challenges in JSON format.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 600,
        temperature: 0.8,
      });

      const response = completion.choices[0]?.message?.content || "[]";
      
      try {
        return JSON.parse(response);
      } catch {
        // Fallback challenges if JSON parsing fails
        return [
          {
            title: "Practice Consistency",
            description: "Complete your practice plan 4 days this week",
            reward_points: 100
          },
          {
            title: "Rhythm Master",
            description: "Play through one full song without stopping",
            reward_points: 150
          },
          {
            title: "Progress Tracker",
            description: "Record a 30-second practice video",
            reward_points: 75
          }
        ];
      }
    } catch (error) {
      console.error("Error generating weekly challenges:", error);
      // Return default challenges
      return [
        {
          title: "Daily Practice",
          description: "Practice for 15 minutes each day this week",
          reward_points: 100
        }
      ];
    }
  }
}

export const lessonRecapAI = new LessonRecapAI();