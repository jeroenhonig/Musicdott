/**
 * AI-powered practice feedback service
 * Phase 3: Automatic Practice Feedback
 */

import { OpenAI } from "openai";

export interface AudioMetrics {
  targetBpm: number;
  measuredBpm: number;
  timingDeviationMs: number;
  dynamicRangeDb: number;
  sectionsWithIssues: string[];
}

export interface VideoMetrics {
  posture: string;
  handHeightVarianceCm: number;
  detectedIssues: string[];
}

export interface PracticeFeedbackData {
  audioMetrics?: AudioMetrics;
  videoMetrics?: VideoMetrics;
  pastTeacherFeedback?: string;
  studentName: string;
  instrument: string;
  studentLanguage?: string;
}

export class PracticeFeedbackAI {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Generate AI feedback from practice video/audio analysis
   */
  async generatePracticeFeedback(data: PracticeFeedbackData): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const systemPrompt = `You are a friendly music teacher giving feedback on a practice video.
Data is provided from audio and video analysis, along with past teacher comments.
Summarise positives first, then give 2–3 specific tips for improvement.
Keep under 100 words, be encouraging and constructive.`;

    const userMessage = {
      analysis_audio: data.audioMetrics,
      analysis_video: data.videoMetrics,
      past_teacher_feedback: data.pastTeacherFeedback || "No previous feedback available",
      student_name: data.studentName,
      instrument: data.instrument,
    };

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userMessage) }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "Unable to generate feedback at this time. Please try again.";
    } catch (error) {
      console.error("Error generating practice feedback:", error);
      throw new Error("Failed to generate practice feedback. Please try again.");
    }
  }

  /**
   * Analyze audio metrics from practice recording
   * This would typically use audio processing libraries like Essentia or Sonic Visualiser
   * For now, returning mock structure that would be filled by actual audio analysis
   */
  async analyzeAudioMetrics(audioPath: string, targetBpm: number = 120): Promise<AudioMetrics> {
    // TODO: Implement actual audio analysis using libraries like:
    // - Essentia for BPM detection and timing analysis
    // - librosa for onset detection
    // - Web Audio API for browser-based analysis

    // Mock analysis for demonstration
    console.log(`Analyzing audio metrics for: ${audioPath}`);
    
    return {
      targetBpm,
      measuredBpm: targetBpm + (Math.random() - 0.5) * 10, // Simulate slight variation
      timingDeviationMs: Math.random() * 50, // 0-50ms deviation
      dynamicRangeDb: 10 + Math.random() * 10, // 10-20dB range
      sectionsWithIssues: Math.random() > 0.7 ? [`bars 9–12: timing inconsistencies`] : [],
    };
  }

  /**
   * Analyze video metrics from practice recording
   * This would use computer vision libraries like MediaPipe
   */
  async analyzeVideoMetrics(videoPath: string): Promise<VideoMetrics> {
    // TODO: Implement actual video analysis using:
    // - MediaPipe Pose for posture detection
    // - OpenCV for movement tracking
    // - Custom ML models for instrument-specific analysis

    // Mock analysis for demonstration
    console.log(`Analyzing video metrics for: ${videoPath}`);
    
    const postureOptions = ["good posture", "slight forward lean", "shoulders too high", "relaxed position"];
    const issues = [
      "left wrist bends inward after 30s",
      "right arm tension visible",
      "inconsistent stick height",
      "good overall form"
    ];

    return {
      posture: postureOptions[Math.floor(Math.random() * postureOptions.length)],
      handHeightVarianceCm: Math.random() * 8, // 0-8cm variation
      detectedIssues: Math.random() > 0.6 ? [issues[Math.floor(Math.random() * issues.length)]] : [],
    };
  }

  /**
   * Complete practice analysis workflow
   */
  async analyzePracticeSession(params: {
    audioPath?: string;
    videoPath?: string;
    targetBpm?: number;
    studentName: string;
    instrument: string;
    pastFeedback?: string;
    language?: string;
  }): Promise<{
    audioMetrics?: AudioMetrics;
    videoMetrics?: VideoMetrics;
    feedback: string;
  }> {
    const audioMetrics = params.audioPath 
      ? await this.analyzeAudioMetrics(params.audioPath, params.targetBpm) 
      : undefined;

    const videoMetrics = params.videoPath 
      ? await this.analyzeVideoMetrics(params.videoPath) 
      : undefined;

    const feedback = await this.generatePracticeFeedback({
      audioMetrics,
      videoMetrics,
      pastTeacherFeedback: params.pastFeedback,
      studentName: params.studentName,
      instrument: params.instrument,
      studentLanguage: params.language || 'English',
    });

    return {
      audioMetrics,
      videoMetrics,
      feedback,
    };
  }
}

export const practiceFeedbackAI = new PracticeFeedbackAI();