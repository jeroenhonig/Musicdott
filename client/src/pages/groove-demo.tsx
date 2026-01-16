import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import Layout from "@/components/layouts/app-layout";
import GrooveDisplay from "@/components/groove-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function GrooveDemo() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Get actual lesson data with GrooveScribe patterns
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['/api/lessons'],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Layout title="GrooveScribe Demo">
        <div>Loading lessons...</div>
      </Layout>
    );
  }

  // Find lessons with GrooveScribe patterns
  const lessonsWithGrooves = lessons?.filter(lesson => 
    lesson.contentBlocks?.some(block => block.type === 'groovescribe')
  ) || [];

  const firstLessonWithGroove = lessonsWithGrooves[0];
  const groovePatterns = firstLessonWithGroove?.contentBlocks?.filter(
    block => block.type === 'groovescribe'
  ) || [];

  return (
    <Layout title="GrooveScribe Patterns from Stored Data">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/lessons')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lessons
          </Button>
          <h1 className="text-2xl font-bold">Live GrooveScribe Patterns</h1>
        </div>

        {firstLessonWithGroove && (
          <Card>
            <CardHeader>
              <CardTitle>Lesson: {firstLessonWithGroove.title}</CardTitle>
              <p className="text-gray-600">
                Category: {firstLessonWithGroove.category || 'Uncategorized'} • 
                Level: {firstLessonWithGroove.level} • 
                Patterns: {groovePatterns.length}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {groovePatterns.map((pattern, index) => (
                  <GrooveDisplay
                    key={index}
                    pattern={pattern.pattern}
                    title={`Pattern ${index + 1}: ${pattern.title || 'Groove Pattern'}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Stored Lesson Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {lessons?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Total Lessons</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {lessonsWithGrooves.length}
                </div>
                <div className="text-sm text-gray-600">With GrooveScribe</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {groovePatterns.length}
                </div>
                <div className="text-sm text-gray-600">Patterns in Current</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}