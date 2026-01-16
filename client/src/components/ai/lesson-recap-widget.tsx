/**
 * AI Lesson Recap Widget
 * Phase 1: Automated Lesson Summaries
 */

import React, { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Send, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LessonRecapWidgetProps {
  lessonId: number;
  studentName: string;
  studentId: number;
  instrument: string;
  level: string;
  studentLanguage?: string;
}

export function LessonRecapWidget({
  lessonId,
  studentName,
  studentId,
  instrument,
  level,
  studentLanguage = 'English'
}: LessonRecapWidgetProps) {
  const [notes, setNotes] = useState("");
  const [generatedRecap, setGeneratedRecap] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateRecapMutation = useMutation({
    mutationFn: async (data: {
      studentName: string;
      instrument: string;
      level: string;
      lessonNotes: string;
      studentLanguage: string;
    }) => {
      const response = await apiRequest(`/api/ai/lesson-recap`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data) => {
      setGeneratedRecap(data.recap);
      setIsEditing(true);
      toast({
        title: "AI Recap Generated",
        description: "Review and edit the recap before sending to student.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed", 
        description: error.message || "Failed to generate lesson recap",
        variant: "destructive",
      });
    },
  });

  const saveRecapMutation = useMutation({
    mutationFn: async (recapData: {
      lessonId: number;
      studentId: number;
      rawNotes: string;
      recapText: string;
    }) => {
      const response = await apiRequest(`/api/lessons/${lessonId}/recap`, {
        method: "POST",
        body: JSON.stringify(recapData),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Recap Saved",
        description: "Lesson recap has been saved and sent to the student.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setNotes("");
      setGeneratedRecap("");
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save lesson recap",
        variant: "destructive",
      });
    },
  });

  const handleGenerateRecap = () => {
    if (!notes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please enter your lesson notes first.",
        variant: "destructive",
      });
      return;
    }

    generateRecapMutation.mutate({
      studentName,
      instrument,
      level,
      lessonNotes: notes,
      studentLanguage,
    });
  };

  const handleSaveRecap = () => {
    if (!generatedRecap.trim()) {
      toast({
        title: "Recap Required",
        description: "Please generate a recap first.",
        variant: "destructive",
      });
      return;
    }

    saveRecapMutation.mutate({
      lessonId,
      studentId,
      rawNotes: notes,
      recapText: generatedRecap,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Lesson Recap for {studentName}
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI Powered
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Step 1: Teacher Notes Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Quick Lesson Notes
          </label>
          <Textarea
            placeholder="e.g., worked on groove @80bpm, introduced ghost notes, student struggled with left hand, homework = 2x per day 10min"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px]"
            disabled={generateRecapMutation.isPending}
          />
        </div>

        {/* Step 2: Generate Button */}
        <Button 
          onClick={handleGenerateRecap}
          disabled={generateRecapMutation.isPending || !notes.trim()}
          className="w-full"
        >
          {generateRecapMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating AI Recap...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Recap
            </>
          )}
        </Button>

        {/* Step 3: Generated Recap (Editable) */}
        {generatedRecap && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Generated Recap {isEditing && "(editable)"}
            </label>
            {isEditing ? (
              <Textarea
                value={generatedRecap}
                onChange={(e) => setGeneratedRecap(e.target.value)}
                className="min-h-[120px]"
                placeholder="Edit the AI-generated recap before saving..."
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-sm leading-relaxed">
                {generatedRecap}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Action Buttons */}
        {generatedRecap && (
          <div className="flex gap-2">
            {isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="flex-1"
              >
                Preview
              </Button>
            )}
            
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex-1"
              >
                Edit Recap
              </Button>
            )}

            <Button
              onClick={handleSaveRecap}
              disabled={saveRecapMutation.isPending}
              className="flex-1"
            >
              {saveRecapMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Save & Send
                </>
              )}
            </Button>
          </div>
        )}

        {/* Student Info */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">Student:</span> {studentName}
            </div>
            <div>
              <span className="font-medium">Instrument:</span> {instrument}
            </div>
            <div>
              <span className="font-medium">Level:</span> {level}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}