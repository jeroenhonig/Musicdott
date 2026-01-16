import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar";
import { Clock, User, MapPin, Phone, Calendar, ChevronRight, BookOpen, Music } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from '@/lib/i18n';
import StudentOverviewDashboard from '@/components/students/student-overview-dashboard';

interface TodaysStudent {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  startTime: string;
  endTime: string;
  location?: string;
  phoneNumber?: string;
  email?: string;
  age?: number;
  instrument?: string;
  level?: string;
  assignedLessons?: number;
  assignedSongs?: number;
  progress?: number;
  lastActivity?: string;
}

interface StudentDetailsProps {
  student: TodaysStudent;
  onClose: () => void;
}

function StudentDetails({ student, onClose }: StudentDetailsProps) {
  const { t } = useTranslation();
  
  const { data: studentLessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['/api/student/lessons', student.id],
    enabled: !!student.id,
  });

  const { data: studentSongs, isLoading: songsLoading } = useQuery({
    queryKey: ['/api/student/songs', student.id],
    enabled: !!student.id,
  });

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto">
      {/* Student Header */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <Avatar className="w-16 h-16">
          <AvatarInitials className="text-lg font-semibold">
            {student.firstName?.[0]}{student.lastName?.[0]}
          </AvatarInitials>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {student.startTime} - {student.endTime}
            </div>
            {student.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {student.location}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="mb-2">
            {student.instrument || 'Drums'}
          </Badge>
          <div className="text-sm text-gray-500">
            {student.level || 'Intermediate'}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('contact_information')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {student.phoneNumber && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{student.phoneNumber}</span>
            </div>
          )}
          {student.email && (
            <div className="flex items-center gap-3">
              <span className="text-sm">📧</span>
              <span className="text-sm">{student.email}</span>
            </div>
          )}
          {student.age && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{student.age} years old</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('assigned_lessons')} ({studentLessons?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lessonsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : studentLessons?.length > 0 ? (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {studentLessons.map((lesson: any) => (
                  <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{lesson.title}</div>
                      <div className="text-xs text-gray-500">{lesson.categoryName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {lesson.level || 'Intermediate'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/student/lesson/${lesson.id}`, '_blank')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No lessons assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Songs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {t('assigned_songs')} ({studentSongs?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {songsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : studentSongs?.length > 0 ? (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {studentSongs.map((song: any) => (
                  <div key={song.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{song.title}</div>
                      <div className="text-xs text-gray-500">{song.composer}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {song.genre || 'Rock'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/student/song/${song.id}`, '_blank')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No songs assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TodayWindow() {
  const { t } = useTranslation();
  const [selectedStudent, setSelectedStudent] = useState<TodaysStudent | null>(null);
  
  const { data: todaysSchedule, isLoading } = useQuery({
    queryKey: ['/api/schedule/today'],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isCurrentLesson = (startTime: string, endTime: string) => {
    const now = getCurrentTime();
    return now >= startTime && now <= endTime;
  };

  const getNextLesson = () => {
    if (!todaysSchedule) return null;
    const now = getCurrentTime();
    return todaysSchedule.find((student: TodaysStudent) => student.startTime > now);
  };

  const nextLesson = getNextLesson();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('today_schedule')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('today_schedule')}
          </div>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!todaysSchedule || todaysSchedule.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No lessons scheduled today</p>
            <p className="text-sm">Enjoy your day off!</p>
          </div>
        ) : (
          <>
            {/* Next lesson highlight */}
            {nextLesson && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Next lesson:</span>
                </div>
                <div className="text-sm text-blue-600">
                  {nextLesson.name} at {nextLesson.startTime} - {nextLesson.endTime}
                </div>
              </div>
            )}

            {/* Today's schedule */}
            <div className="space-y-3">
              {todaysSchedule.map((student: TodaysStudent) => (
                <Dialog key={student.id} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                  <DialogTrigger asChild>
                    <div 
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isCurrentLesson(student.startTime, student.endTime)
                          ? 'bg-green-50 border-green-200 ring-2 ring-green-100'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarInitials className="text-sm">
                            {student.firstName?.[0]}{student.lastName?.[0]}
                          </AvatarInitials>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{student.name}</span>
                            {isCurrentLesson(student.startTime, student.endTime) && (
                              <Badge variant="default" className="bg-green-500 text-white">
                                Current
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {student.startTime} - {student.endTime}
                            </div>
                            {student.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {student.location}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {student.name} - {t('student_overview')}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                      {selectedStudent && (
                        <StudentOverviewDashboard 
                          studentId={selectedStudent.id} 
                          onClose={() => setSelectedStudent(null)} 
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}