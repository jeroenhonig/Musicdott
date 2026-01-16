/**
 * AI-powered transcription and translation service
 * Phase 1: Instant Translation & Captions using OpenAI Whisper
 */

import { OpenAI } from "openai";
import fs from "fs";

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface TranslationResult {
  translatedText: string;
  vtt: string;
}

export class TranscriptionAI {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Transcribe audio/video using OpenAI Whisper
   */
  async transcribeMedia(filePath: string): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    try {
      const transcript = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
        response_format: "verbose_json", // includes timestamps
      });

      return {
        text: transcript.text,
        segments: transcript.segments?.map(segment => ({
          start: segment.start,
          end: segment.end,
          text: segment.text,
        })),
      };
    } catch (error) {
      console.error("Error transcribing media:", error);
      throw new Error("Failed to transcribe media. Please try again.");
    }
  }

  /**
   * Translate transcript to target language
   */
  async translateTranscript(transcript: TranscriptionResult, targetLanguage: string): Promise<TranslationResult> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    const systemPrompt = `Translate the following transcript into ${targetLanguage}, keeping timestamps intact and translating naturally for a music student.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(transcript) }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const translatedContent = completion.choices[0]?.message?.content || "";
      
      // Generate VTT captions
      const vtt = this.generateVTT(transcript.segments || [], translatedContent);

      return {
        translatedText: translatedContent,
        vtt: vtt,
      };
    } catch (error) {
      console.error("Error translating transcript:", error);
      throw new Error("Failed to translate transcript. Please try again.");
    }
  }

  /**
   * Generate VTT caption format from segments
   */
  private generateVTT(segments: Array<{start: number; end: number; text: string}>, translatedText?: string): string {
    let vtt = "WEBVTT\n\n";

    segments.forEach((segment, index) => {
      const startTime = this.formatTime(segment.start);
      const endTime = this.formatTime(segment.end);
      const text = translatedText ? this.extractTranslatedSegment(translatedText, index, segments.length) : segment.text;

      vtt += `${index + 1}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${text}\n\n`;
    });

    return vtt;
  }

  /**
   * Format seconds to VTT time format (HH:MM:SS.mmm)
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Extract translated segment from full translated text
   */
  private extractTranslatedSegment(translatedText: string, index: number, totalSegments: number): string {
    // Simple approach: split translated text by sentences and map to segments
    const sentences = translatedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const segmentIndex = Math.min(index, sentences.length - 1);
    return sentences[segmentIndex]?.trim() || "";
  }

  /**
   * Process video/audio for captions in multiple languages
   */
  async processMediaForCaptions(filePath: string, targetLanguages: string[] = ['en']): Promise<{
    originalTranscript: TranscriptionResult;
    translations: Record<string, TranslationResult>;
  }> {
    // Step 1: Transcribe original audio
    const originalTranscript = await this.transcribeMedia(filePath);

    // Step 2: Translate to target languages
    const translations: Record<string, TranslationResult> = {};
    
    for (const language of targetLanguages) {
      if (language !== 'en') { // Assuming original is English
        translations[language] = await this.translateTranscript(originalTranscript, language);
      } else {
        // Generate VTT for original English
        translations[language] = {
          translatedText: originalTranscript.text,
          vtt: this.generateVTT(originalTranscript.segments || [])
        };
      }
    }

    return {
      originalTranscript,
      translations,
    };
  }
}

export const transcriptionAI = new TranscriptionAI();