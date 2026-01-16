/**
 * Smart Assignment Builder with AI
 * Phase 3: Smart Assignment Builder
 */

import { OpenAI } from "openai";

export interface SmartAssignmentData {
  teacherText: string;
  instrument: string;
  level: string;
  language: string;
}

export interface AssignmentStep {
  title: string;
  description: string;
  bpm?: number;
  focus: string;
  estimatedMinutes: number;
}

export interface SmartAssignmentResult {
  title: string;
  description: string;
  steps: AssignmentStep[];
  musicxml?: string;
  suggestedAudioLinks: string[];
  estimatedTotalMinutes: number;
}

export class SmartAssignmentBuilder {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Generate comprehensive assignment from teacher's plain language description
   */
  async buildSmartAssignment(data: SmartAssignmentData): Promise<SmartAssignmentResult> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const systemPrompt = `You are an assistant for music teachers.
You create step-by-step music practice assignments from teacher goals.
Output in JSON format with:
- title: Clear assignment title
- description: Brief overview
- steps: Array of practice steps with title, description, bpm, focus, estimatedMinutes
- musicxml: Basic MusicXML notation if applicable
- suggestedAudioLinks: Array of YouTube/Spotify search terms
- estimatedTotalMinutes: Total practice time

Keep assignments practical and progressive for the student level.`;

    const userPrompt = `Teacher goal: ${data.teacherText}
Instrument: ${data.instrument}
Student level: ${data.level}
Language: ${data.language}

Generate a comprehensive assignment in JSON format.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || "{}";
      
      try {
        const parsedResult = JSON.parse(response);
        return this.validateAndEnhanceAssignment(parsedResult, data);
      } catch (parseError) {
        // Fallback to structured assignment if JSON parsing fails
        return this.createFallbackAssignment(data);
      }
    } catch (error) {
      console.error("Error generating smart assignment:", error);
      throw new Error("Failed to generate assignment. Please try again.");
    }
  }

  /**
   * Validate and enhance the AI-generated assignment
   */
  private validateAndEnhanceAssignment(result: any, originalData: SmartAssignmentData): SmartAssignmentResult {
    return {
      title: result.title || `${originalData.instrument} Practice Assignment`,
      description: result.description || "Practice session designed for skill development",
      steps: Array.isArray(result.steps) ? result.steps.map((step: any) => ({
        title: step.title || "Practice Step",
        description: step.description || "Focus on technique",
        bpm: step.bpm || 120,
        focus: step.focus || "General technique",
        estimatedMinutes: step.estimatedMinutes || 15,
      })) : this.createDefaultSteps(originalData),
      musicxml: result.musicxml || this.generateBasicMusicXML(originalData),
      suggestedAudioLinks: Array.isArray(result.suggestedAudioLinks) 
        ? result.suggestedAudioLinks 
        : this.generateDefaultAudioLinks(originalData),
      estimatedTotalMinutes: result.estimatedTotalMinutes || 45,
    };
  }

  /**
   * Create fallback assignment structure
   */
  private createFallbackAssignment(data: SmartAssignmentData): SmartAssignmentResult {
    const steps = this.createDefaultSteps(data);
    
    return {
      title: `${data.instrument} Assignment - ${data.level}`,
      description: `Practice assignment based on: ${data.teacherText}`,
      steps,
      musicxml: this.generateBasicMusicXML(data),
      suggestedAudioLinks: this.generateDefaultAudioLinks(data),
      estimatedTotalMinutes: steps.reduce((total, step) => total + step.estimatedMinutes, 0),
    };
  }

  /**
   * Create default practice steps based on instrument and level
   */
  private createDefaultSteps(data: SmartAssignmentData): AssignmentStep[] {
    const baseSteps: AssignmentStep[] = [
      {
        title: "Warm-up",
        description: "Start with basic technique exercises to prepare",
        bpm: 80,
        focus: "Technique foundation",
        estimatedMinutes: 10,
      },
      {
        title: "Main Practice",
        description: `Focus on the specific goals: ${data.teacherText}`,
        bpm: 100,
        focus: "Core skill development",
        estimatedMinutes: 20,
      },
      {
        title: "Application",
        description: "Apply the skills in musical context",
        bpm: 120,
        focus: "Musical application",
        estimatedMinutes: 15,
      },
    ];

    // Adjust based on level
    if (data.level === 'beginner') {
      baseSteps.forEach(step => {
        step.bpm = Math.max(60, (step.bpm || 120) - 20);
        step.estimatedMinutes = Math.min(step.estimatedMinutes, 10);
      });
    } else if (data.level === 'advanced') {
      baseSteps.forEach(step => {
        step.bpm = (step.bpm || 120) + 20;
        step.estimatedMinutes += 5;
      });
    }

    return baseSteps;
  }

  /**
   * Generate basic MusicXML notation template
   */
  private generateBasicMusicXML(data: SmartAssignmentData): string {
    // Basic MusicXML template - in a real implementation, this would be more sophisticated
    return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>${data.instrument}</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>percussion</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
  }

  /**
   * Generate default audio search terms
   */
  private generateDefaultAudioLinks(data: SmartAssignmentData): string[] {
    const baseTerms = [
      `${data.instrument} ${data.level} practice`,
      `${data.instrument} backing track`,
      `${data.instrument} technique exercises`,
    ];

    // Add specific terms based on teacher text
    if (data.teacherText.toLowerCase().includes('rock')) {
      baseTerms.push(`${data.instrument} rock backing track`);
    }
    if (data.teacherText.toLowerCase().includes('jazz')) {
      baseTerms.push(`${data.instrument} jazz backing track`);
    }
    if (data.teacherText.toLowerCase().includes('blues')) {
      baseTerms.push(`${data.instrument} blues backing track`);
    }

    return baseTerms;
  }

  /**
   * Generate assignment with GrooveScribe integration
   */
  async buildGrooveAssignment(data: SmartAssignmentData & { groovePatternId?: string }): Promise<SmartAssignmentResult> {
    const baseAssignment = await this.buildSmartAssignment(data);
    
    // If a groove pattern is specified, integrate it
    if (data.groovePatternId) {
      baseAssignment.steps.push({
        title: "Groove Pattern Practice",
        description: `Practice the groove pattern: ${data.groovePatternId}`,
        focus: "Groove development",
        estimatedMinutes: 20,
        bpm: 120,
      });
      
      baseAssignment.estimatedTotalMinutes += 20;
    }

    return baseAssignment;
  }
}

export const smartAssignmentBuilder = new SmartAssignmentBuilder();