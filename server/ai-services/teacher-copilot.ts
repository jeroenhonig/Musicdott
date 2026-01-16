/**
 * Teacher Copilot AI Assistant
 * Phase 4: Teacher Copilot for real-time lesson assistance
 */

import { OpenAI } from "openai";

export interface CopilotQuery {
  teacherId: number;
  studentId?: number;
  queryText: string;
  context?: {
    studentLevel?: string;
    instrument?: string;
    currentLesson?: string;
  };
}

export interface CopilotResponse {
  resources: Array<{
    title: string;
    type: string;
    link: string;
    description: string;
  }>;
  suggestions: Array<{
    title: string;
    description: string;
    musicxml?: string;
    instructions: string;
  }>;
  quickActions: Array<{
    action: string;
    label: string;
    data: any;
  }>;
}

export class TeacherCopilot {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Process teacher query and return relevant resources and suggestions
   */
  async processQuery(query: CopilotQuery): Promise<CopilotResponse> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const systemPrompt = `You are a music lesson assistant for teachers.
You have access to a teacher's resource library and student history.
When given a request, return:
- Up to 3 relevant resources (title, type, link, description)
- Optional AI-generated new exercise (MusicXML + instructions)
- Quick actions the teacher can take

Always tailor difficulty to the student's current level.
Output in JSON format.`;

    const userMessage = {
      query: query.queryText,
      student_level: query.context?.studentLevel || "Beginner",
      instrument: query.context?.instrument || "Piano",
      current_lesson: query.context?.currentLesson || "Not specified",
    };

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userMessage) }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || "{}";
      
      try {
        const parsedResponse = JSON.parse(response);
        return this.validateResponse(parsedResponse, query);
      } catch (parseError) {
        return this.createFallbackResponse(query);
      }
    } catch (error) {
      console.error("Error processing copilot query:", error);
      return this.createFallbackResponse(query);
    }
  }

  /**
   * Validate and enhance AI response
   */
  private validateResponse(response: any, query: CopilotQuery): CopilotResponse {
    return {
      resources: Array.isArray(response.resources) ? response.resources.map((r: any) => ({
        title: r.title || "Practice Resource",
        type: r.type || "exercise",
        link: r.link || "#",
        description: r.description || "Helpful practice material",
      })) : [],
      suggestions: Array.isArray(response.suggestions) ? response.suggestions.map((s: any) => ({
        title: s.title || "Practice Suggestion",
        description: s.description || "Try this exercise",
        musicxml: s.musicxml,
        instructions: s.instructions || "Practice slowly and build up speed",
      })) : [],
      quickActions: Array.isArray(response.quickActions) ? response.quickActions.map((a: any) => ({
        action: a.action || "suggest",
        label: a.label || "Quick Action",
        data: a.data || {},
      })) : [],
    };
  }

  /**
   * Create fallback response when AI fails
   */
  private createFallbackResponse(query: CopilotQuery): CopilotResponse {
    const instrument = query.context?.instrument?.toLowerCase() || "instrument";
    const level = query.context?.studentLevel?.toLowerCase() || "beginner";

    return {
      resources: [
        {
          title: `${instrument} ${level} exercises`,
          type: "exercise",
          link: "/resources/exercises",
          description: `Basic ${instrument} exercises for ${level} students`,
        },
        {
          title: "Practice routine guide",
          type: "guide",
          link: "/resources/practice-guide",
          description: "Structured practice routine recommendations",
        },
      ],
      suggestions: [
        {
          title: "Warm-up Exercise",
          description: "Start with scales and basic technique",
          instructions: "Practice slowly, focus on accuracy before speed",
        },
      ],
      quickActions: [
        {
          action: "create_assignment",
          label: "Create Practice Assignment",
          data: { type: "practice", instrument, level },
        },
      ],
    };
  }

  /**
   * Search resource library using vector similarity
   */
  async searchResources(query: string, filters?: {
    instrument?: string;
    level?: string;
    type?: string;
  }): Promise<Array<{
    id: string;
    title: string;
    type: string;
    relevanceScore: number;
    content: string;
  }>> {
    // TODO: Implement vector search with embeddings
    // This would typically use a vector database like Pinecone or pgvector
    // For now, return mock results
    
    console.log(`Searching resources for: ${query} with filters:`, filters);
    
    return [
      {
        id: "1",
        title: "Basic Rhythm Patterns",
        type: "exercise",
        relevanceScore: 0.85,
        content: "Fundamental rhythm exercises for beginners",
      },
      {
        id: "2", 
        title: "Scale Practice Guide",
        type: "guide",
        relevanceScore: 0.78,
        content: "Comprehensive guide to practicing scales effectively",
      },
    ];
  }

  /**
   * Generate practice exercise with MusicXML notation
   */
  async generateExercise(params: {
    instrument: string;
    level: string;
    focus: string;
    timeSignature?: string;
    keySignature?: string;
  }): Promise<{
    title: string;
    description: string;
    musicxml: string;
    instructions: string[];
  }> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `Create a ${params.instrument} exercise for ${params.level} level focusing on ${params.focus}.
Include:
- Exercise title and description
- Step-by-step instructions
- Basic MusicXML notation
- Practice tips

Format as JSON with fields: title, description, musicxml, instructions (array).`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || "{}";
      const parsedResponse = JSON.parse(response);
      
      return {
        title: parsedResponse.title || `${params.focus} Exercise`,
        description: parsedResponse.description || "Practice exercise",
        musicxml: parsedResponse.musicxml || this.generateBasicMusicXML(params),
        instructions: Array.isArray(parsedResponse.instructions) 
          ? parsedResponse.instructions 
          : ["Practice slowly", "Focus on accuracy", "Gradually increase tempo"],
      };
    } catch (error) {
      console.error("Error generating exercise:", error);
      return {
        title: `${params.focus} Exercise`,
        description: `Practice exercise for ${params.instrument} focusing on ${params.focus}`,
        musicxml: this.generateBasicMusicXML(params),
        instructions: ["Practice slowly", "Focus on accuracy", "Gradually increase tempo"],
      };
    }
  }

  /**
   * Generate basic MusicXML template
   */
  private generateBasicMusicXML(params: {
    instrument: string;
    timeSignature?: string;
    keySignature?: string;
  }): string {
    const timeSignature = params.timeSignature || "4/4";
    const [beats, beatType] = timeSignature.split("/");
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>${params.instrument}</part-name>
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
          <beats>${beats}</beats>
          <beat-type>${beatType}</beat-type>
        </time>
        <clef>
          <sign>treble</sign>
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
}

export const teacherCopilot = new TeacherCopilot();