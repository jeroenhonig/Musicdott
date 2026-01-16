/**
 * Lesson Progress Tracker - Track student progress through lessons
 * Implements suggestion #4 from the future-proofing guide
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  PlayCircle, 
  Trophy,
  Users,
  Target,
  ChevronRight
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LessonProgress {
  id: number;
  studentId: number;
  lessonId: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'mastered';
  progress: number;
  notes?: string;
  timeSpent: number;
  lastPracticed?: string;
  teacherNotes?: string;
  student: {
    name: string;
    username: string;
  };
  lesson: {
    title: string;
    level: string;
  };
}

export default function LessonProgressTracker() {
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);

  const { data: progressData, isLoading } = useQuery<LessonProgress[]>({
    queryKey: ['/api/lesson-progress'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ progressId, updates }: { progressId: number; updates: Partial<LessonProgress> }) =>
      apiRequest(`/api/lesson-progress/${progressId}`, 'PATCH', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lesson-progress'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'mastered': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'not_started': return <BookOpen className="w-4 h-4" />;
      case 'in_progress': return <PlayCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'mastered': return <Trophy className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading progress data...</p>
        </div>
      </div>
    );
  }

  // Group progress by student
  const studentProgress = progressData?.reduce((acc, progress) => {
    const studentId = progress.studentId;
    if (!acc[studentId]) {
      acc[studentId] = {
        student: progress.student,
        lessons: []
      };
    }
    acc[studentId].lessons.push(progress);
    return acc;
  }, {} as Record<number, { student: any; lessons: LessonProgress[] }>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Lesson Progress Tracking</h2>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <span className="text-sm text-muted-foreground">
            {Object.keys(studentProgress).length} students tracked
          </span>
        </div>
      </div>

      {/* Progress Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['not_started', 'in_progress', 'completed', 'mastered'].map(status => {
          const count = progressData?.filter(p => p.status === status).length || 0;
          return (
            <Card key={status}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {status.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Student Progress List */}
      <div className="space-y-4">
        {Object.entries(studentProgress).map(([studentId, data]) => (
          <Card key={studentId}>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => setSelectedStudent(
                selectedStudent === parseInt(studentId) ? null : parseInt(studentId)
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {data.student.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{data.student.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">@{data.student.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{data.lessons.length} lessons</p>
                    <div className="flex gap-1">
                      {['completed', 'mastered'].map(status => {
                        const count = data.lessons.filter(l => l.status === status).length;
                        return count > 0 && (
                          <Badge key={status} className={getStatusColor(status)}>
                            {count} {status}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <ChevronRight 
                    className={`w-5 h-5 transition-transform ${
                      selectedStudent === parseInt(studentId) ? 'rotate-90' : ''
                    }`} 
                  />
                </div>
              </div>
            </CardHeader>

            {selectedStudent === parseInt(studentId) && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {data.lessons.map(progress => (
                    <div key={progress.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{progress.lesson.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {progress.lesson.level}
                          </Badge>
                        </div>
                        <Badge className={getStatusColor(progress.status)}>
                          {getStatusIcon(progress.status)}
                          <span className="ml-1 capitalize">{progress.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>

                      {progress.progress > 0 && (
                        <div className="mb-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{progress.progress}%</span>
                          </div>
                          <Progress value={progress.progress} className="h-2" />
                        </div>
                      )}

                      {progress.timeSpent > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Time spent: {Math.floor(progress.timeSpent / 60)}h {progress.timeSpent % 60}m
                        </p>
                      )}

                      {progress.notes && (
                        <div className="mt-2">
                          <p className="text-xs font-medium mb-1">Student Notes:</p>
                          <p className="text-sm bg-gray-50 p-2 rounded">{progress.notes}</p>
                        </div>
                      )}

                      {progress.teacherNotes && (
                        <div className="mt-2">
                          <p className="text-xs font-medium mb-1">Teacher Notes:</p>
                          <p className="text-sm bg-blue-50 p-2 rounded">{progress.teacherNotes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {Object.keys(studentProgress).length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No Progress Data</h3>
            <p className="text-muted-foreground">
              Progress tracking will be available once students start practicing lessons.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}