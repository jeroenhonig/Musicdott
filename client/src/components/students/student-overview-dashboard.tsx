import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  BookOpen, 
  Music, 
  Trophy, 
  Clock, 
  Target,
  TrendingUp,
  Award,
  PlayCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus
} from "lucide-react";
import { useTranslation } from '@/lib/i18n';

interface StudentOverviewProps {
  studentId: number;
  onClose?: () => void;
}

interface StudentDetails {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  age?: number;
  instrument?: string;
  level?: string;
  joinDate?: string;
  lastActivity?: string;
  totalLessons?: number;
  completedLessons?: number;
  totalSongs?: number;
  completedSongs?: number;
  practiceHours?: number;
  achievements?: Achievement[];
  upcomingLessons?: UpcomingLesson[];
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  earnedDate: string;
  category: string;
}

interface UpcomingLesson {
  id: number;
  title: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface LessonProgress {
  lessonId: number;
  title: string;
  category: string;
  progress: number;
  lastAccessed: string;
  timeSpent: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review';
}

interface SongProgress {
  songId: number;
  title: string;
  artist: string;
  progress: number;
  lastPracticed: string;
  practiceCount: number;
  status: 'not_started' | 'learning' | 'mastered';
}

export default function StudentOverviewDashboard({ studentId, onClose }: StudentOverviewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: student, isLoading: studentLoading } = useQuery<StudentDetails>({
    queryKey: ['/api/students', studentId],
    enabled: !!studentId,
  });

  const { data: studentLessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['/api/student/lessons', studentId],
    enabled: !!studentId,
  });

  const { data: studentSongs, isLoading: songsLoading } = useQuery({
    queryKey: ['/api/student/songs', studentId],
    enabled: !!studentId,
  });

  const { data: lessonProgress, isLoading: progressLoading } = useQuery<LessonProgress[]>({
    queryKey: ['/api/students', studentId, 'lesson-progress'],
    enabled: !!studentId,
  });

  const { data: songProgress, isLoading: songProgressLoading } = useQuery<SongProgress[]>({
    queryKey: ['/api/students', studentId, 'song-progress'],
    enabled: !!studentId,
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery<Achievement[]>({
    queryKey: ['/api/students', studentId, 'achievements'],
    enabled: !!studentId,
  });

  if (studentLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Student not found</p>
      </div>
    );
  }

  const overallProgress = student.completedLessons && student.totalLessons 
    ? (student.completedLessons / student.totalLessons) * 100 
    : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Student Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarInitials className="text-2xl font-bold">
                {student.firstName?.[0]}{student.lastName?.[0]}
              </AvatarInitials>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{student.name}</h1>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Music className="h-4 w-4" />
                  {student.instrument || 'Drums'}
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {student.level || 'Intermediate'}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {student.age ? `${student.age} years old` : 'Age not specified'}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-primary mb-1">
                {Math.round(overallProgress)}%
              </div>
              <div className="text-sm text-gray-600">Overall Progress</div>
              <Progress value={overallProgress} className="w-24 mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{student.totalLessons || 0}</div>
            <div className="text-sm text-gray-600">Assigned Lessons</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Music className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{student.totalSongs || 0}</div>
            <div className="text-sm text-gray-600">Assigned Songs</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{student.practiceHours || 0}h</div>
            <div className="text-sm text-gray-600">Practice Time</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{achievements?.length || 0}</div>
            <div className="text-sm text-gray-600">Achievements</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="songs">Songs</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {student.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{student.email}</span>
                  </div>
                )}
                {student.phoneNumber && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{student.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    Joined: {student.joinDate || 'Not specified'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    Last Activity: {student.lastActivity || 'Not specified'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <PlayCircle className="h-4 w-4 text-blue-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Completed Lesson</div>
                      <div className="text-xs text-gray-500">2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Music className="h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Practiced Song</div>
                      <div className="text-xs text-gray-500">5 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Award className="h-4 w-4 text-orange-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Earned Achievement</div>
                      <div className="text-xs text-gray-500">1 day ago</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Assigned Lessons ({studentLessons?.length || 0})
                </CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Lesson
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lessonsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {studentLessons?.map((lesson: any) => (
                      <div key={lesson.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{lesson.title}</div>
                          <div className="text-sm text-gray-500">{lesson.categoryName}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{lesson.level || 'Intermediate'}</Badge>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Songs Tab */}
        <TabsContent value="songs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Assigned Songs ({studentSongs?.length || 0})
                </CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Song
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {songsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {studentSongs?.map((song: any) => (
                      <div key={song.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{song.title}</div>
                          <div className="text-sm text-gray-500">{song.composer}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{song.genre || 'Rock'}</Badge>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lesson Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  <div className="space-y-4">
                    {lessonProgress?.map((lesson) => (
                      <div key={lesson.lessonId} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{lesson.title}</div>
                            <div className="text-xs text-gray-500">{lesson.category}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {lesson.progress}%
                            </span>
                            {lesson.status === 'completed' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </div>
                        <Progress value={lesson.progress} className="h-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Song Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  <div className="space-y-4">
                    {songProgress?.map((song) => (
                      <div key={song.songId} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{song.title}</div>
                            <div className="text-xs text-gray-500">{song.artist}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {song.practiceCount} practices
                            </span>
                            {song.status === 'mastered' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </div>
                        <Progress value={song.progress} className="h-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Achievements ({achievements?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievementsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements?.map((achievement) => (
                    <div key={achievement.id} className="p-4 border rounded-lg text-center">
                      <div className="text-2xl mb-2">{achievement.icon}</div>
                      <div className="font-medium">{achievement.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{achievement.description}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        Earned: {achievement.earnedDate}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}