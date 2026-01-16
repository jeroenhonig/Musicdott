import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Play, Clock, Music, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";
import Layout from "@/components/layouts/app-layout";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { EVENT_TYPES, EVENT_ENTITIES, EVENT_ACTIONS } from "@shared/events";

export default function MyLessonsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Real-time synchronization for immediate updates
  const { 
    isConnected, 
    sendEvent, 
    addEventListener 
  } = useRealtimeSync({
    autoConnect: true,
    enableDebugLogs: true
  });
  
  const { data: assignments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/students", user?.id, "assignments"],
    enabled: !!user?.id,
  });

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<any[]>({
    queryKey: ["/api/lessons"],
  });

  const { data: songs = [], isLoading: songsLoading } = useQuery<any[]>({
    queryKey: ["/api/songs"],
  });

  // For demo student account, show all lessons and songs as available
  const isDemo = user?.username === 'teststudent';

  // Handle real-time lesson and song updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeLessonUpdates = addEventListener(EVENT_TYPES.LESSON_CREATE, (event) => {
      toast({
        title: "New lesson available!",
        description: `"${event.data.title}" has been added by your teacher.`,
      });
    });

    const unsubscribeLessonChanges = addEventListener(EVENT_TYPES.LESSON_UPDATE, (event) => {
      toast({
        title: "Lesson updated",
        description: `"${event.data.title}" has been updated.`,
      });
    });

    const unsubscribeSongUpdates = addEventListener(EVENT_TYPES.SONG_CREATE, (event) => {
      toast({
        title: "New song available!",
        description: `"${event.data.title}" has been added to practice.`,
      });
    });

    const unsubscribeSongChanges = addEventListener(EVENT_TYPES.SONG_UPDATE, (event) => {
      toast({
        title: "Song updated",
        description: `"${event.data.title}" has been updated.`,
      });
    });

    return () => {
      unsubscribeLessonUpdates();
      unsubscribeLessonChanges();
      unsubscribeSongUpdates();
      unsubscribeSongChanges();
    };
  }, [isConnected, addEventListener, toast]);

  // Function to start a lesson and notify teachers
  const startLesson = (lesson: any) => {
    if (isConnected) {
      sendEvent({
        type: EVENT_TYPES.LESSON_START,
        entity: EVENT_ENTITIES.LESSON,
        action: EVENT_ACTIONS.START,
        data: {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          studentName: user?.username
        }
      });
    }
    
    // Open lesson in new tab
    window.open(`/lessons/${lesson.id}/view`, '_blank');
  };

  // Function to start song practice and notify teachers
  const startSongPractice = (song: any) => {
    if (isConnected) {
      sendEvent({
        type: EVENT_TYPES.SONG_PRACTICE,
        entity: EVENT_ENTITIES.SONG,
        action: EVENT_ACTIONS.PRACTICE,
        data: {
          songId: song.id,
          songTitle: song.title,
          difficulty: song.difficulty,
          studentName: user?.username
        }
      });
    }
    
    // Open song in new tab
    window.open(`/songs/${song.id}/view`, '_blank');
  };
  
  if (isLoading || lessonsLoading || songsLoading) {
    return (
      <Layout title="My Lessons">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Lessons">
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Lessons</h1>
              <p className="text-gray-600 mt-2">Access your assigned lessons and practice materials</p>
            </div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm">Live updates</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-400">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* For demo account, show all lessons */}
        {isDemo && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">All Available Lessons</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lessons.map((lesson: any) => (
                <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{lesson.title}</CardTitle>
                    {lesson.description && (
                      <CardDescription className="text-sm line-clamp-2">
                        {lesson.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lesson.level && (
                        <Badge variant="secondary">
                          {lesson.level}
                        </Badge>
                      )}
                      {lesson.instrument && (
                        <Badge variant="outline">
                          <Music className="h-3 w-3 mr-1" />
                          {lesson.instrument}
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Available
                      </Badge>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => startLesson(lesson)}
                      data-testid={`button-start-lesson-${lesson.id}`}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Lesson
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {/* For demo account, show all songs */}
        {isDemo && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">All Available Songs</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {songs.map((song: any) => (
                <Card key={song.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{song.title}</CardTitle>
                    {song.artist && (
                      <CardDescription className="text-sm">
                        by {song.artist}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {song.difficulty && (
                        <Badge variant="secondary">
                          {song.difficulty}
                        </Badge>
                      )}
                      {song.instrument && (
                        <Badge variant="outline">
                          <Music className="h-3 w-3 mr-1" />
                          {song.instrument}
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Available
                      </Badge>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => startSongPractice(song)}
                      data-testid={`button-practice-song-${song.id}`}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Practice Song
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Show assigned lessons for regular students or if demo has assignments */}
        {(!isDemo && assignments && assignments.length > 0) && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Assigned Lessons</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment: any) => {
                const lesson = lessons?.find((l: any) => l.id === assignment.lessonId);
                
                return (
                  <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          <CardTitle className="text-lg">{lesson?.title || "Lesson"}</CardTitle>
                        </div>
                        <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                          {assignment.status || 'assigned'}
                        </Badge>
                      </div>
                      {assignment.dueDate && (
                        <CardDescription className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")}</span>
                        </CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {lesson?.description && (
                        <p className="text-sm text-gray-600 line-clamp-3">{lesson.description}</p>
                      )}
                      
                      {lesson?.instrument && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Music className="h-4 w-4" />
                          <span>{lesson.instrument}</span>
                        </div>
                      )}
                      
                      {assignment.notes && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-sm text-blue-900 mb-1">Teacher's Notes:</h4>
                          <p className="text-sm text-blue-800">{assignment.notes}</p>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <Button 
                          className="flex-1" 
                          size="sm"
                          onClick={() => startLesson(lesson)}
                          data-testid={`button-start-assignment-${assignment.id}`}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Practice
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Show empty state for non-demo students with no assignments */}
        {!isDemo && (!assignments || assignments.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons assigned yet</h3>
              <p className="text-gray-600">Your teacher will assign lessons for you to practice.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}