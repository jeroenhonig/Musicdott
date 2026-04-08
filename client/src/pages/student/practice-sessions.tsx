import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Square, Clock, TrendingUp, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layouts/app-layout";
import { EVENT_TYPES, EVENT_ENTITIES, EVENT_ACTIONS } from "@shared/events";
import { useTranslation } from "@/lib/i18n";

export default function PracticeSessionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  
  // Real-time synchronization for practice session coordination
  const { 
    isConnected, 
    sendEvent, 
    addEventListener 
  } = useRealtimeSync({
    autoConnect: true,
    enableDebugLogs: true
  });
  
  // First get the student record for this user
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["/api/students"],
    enabled: !!user?.id && user?.role === 'student',
  });
  
  // Find the student record that belongs to this user
  const currentStudent = students.find(s => s.userId === user?.id);
  const studentId = currentStudent?.id;
  
  const { data: practiceSessions, isLoading } = useQuery({
    queryKey: ["/api/students", studentId, "practice-sessions"],
    enabled: !!studentId,
  });

  const { data: activeSessions } = useQuery({
    queryKey: ["/api/practice-sessions/active"],
    enabled: !!user?.id,
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/practice-sessions", {});
    },
    onSuccess: (sessionData) => {
      setIsRecording(true);
      
      // Notify teachers about practice session start
      if (isConnected) {
        sendEvent({
          type: EVENT_TYPES.PRACTICE_START,
          entity: EVENT_ENTITIES.PRACTICE,
          action: EVENT_ACTIONS.START,
          data: {
            practiceSessionId: sessionData.id,
            studentName: user?.username,
            startTime: new Date().toISOString()
          }
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/practice-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice-sessions/active"] });
      toast({
        title: t('studentPortal.practice.toast.startedTitle'),
        description: t('studentPortal.practice.toast.startedDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: t('studentPortal.practice.toast.startError'),
        variant: "destructive",
      });
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return apiRequest("POST", `/api/practice-sessions/${sessionId}/end`, {});
    },
    onSuccess: (sessionData, sessionId) => {
      setIsRecording(false);
      
      // Calculate session duration
      const duration = activeSession ? 
        Math.floor((new Date().getTime() - new Date(activeSession.startTime).getTime()) / (1000 * 60)) : 0;
      
      // Notify teachers about practice session end
      if (isConnected) {
        sendEvent({
          type: EVENT_TYPES.PRACTICE_END,
          entity: EVENT_ENTITIES.PRACTICE,
          action: EVENT_ACTIONS.END,
          data: {
            practiceSessionId: sessionId,
            studentName: user?.username,
            duration: duration,
            endTime: new Date().toISOString()
          }
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/practice-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice-sessions/active"] });
      toast({
        title: t('studentPortal.practice.toast.endedTitle'),
        description: t('studentPortal.practice.toast.endedDescription'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('studentPortal.practice.toast.endError'),
        variant: "destructive",
      });
    },
  });

  const activeSession = Array.isArray(activeSessions) ? activeSessions[0] : null;

  if (isLoading) {
    return (
      <AppLayout title={t('studentPortal.practice.title')}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const recentSessions = Array.isArray(practiceSessions) ? practiceSessions.slice(0, 10) : [];
  const totalMinutes = Array.isArray(practiceSessions) ? practiceSessions.reduce((total: number, session: any) => {
    if (session.endTime) {
      const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
      return total + Math.floor(duration / (1000 * 60));
    }
    return total;
  }, 0) : 0;

  return (
    <AppLayout title={t('studentPortal.practice.title')}>
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('studentPortal.practice.title')}</h1>
              <p className="text-gray-600 mt-2">{t('studentPortal.practice.subtitle')}</p>
            </div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm">{t('studentPortal.practice.liveTracking')}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-400">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">{t('studentPortal.practice.offline')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Practice Control */}
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-6 text-center">
            {activeSession ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-lg font-medium">{t('studentPortal.practice.inProgress')}</span>
                </div>
                <p className="text-gray-600">
                  {t('studentPortal.practice.started')} {format(new Date(activeSession.startTime), "h:mm a")}
                </p>
                <Button
                  onClick={() => endSessionMutation.mutate(activeSession.id)}
                  disabled={endSessionMutation.isPending}
                  variant="destructive"
                  size="lg"
                  data-testid="button-end-practice"
                >
                  <Square className="h-5 w-5 mr-2" />
                  {t('studentPortal.practice.endSession')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <PlayCircle className="h-16 w-16 text-green-600 mx-auto" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">{t('studentPortal.practice.readyToPractice')}</h3>
                  <p className="text-gray-600 mb-4">{t('studentPortal.practice.startPrompt')}</p>
                  <Button
                    onClick={() => startSessionMutation.mutate()}
                    disabled={startSessionMutation.isPending}
                    size="lg"
                    data-testid="button-start-practice"
                  >
                    <PlayCircle className="h-5 w-5 mr-2" />
                    {t('studentPortal.practice.startSession')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Practice Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>{t('studentPortal.practice.statsTitle')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</div>
                  <p className="text-gray-600">{t('studentPortal.practice.totalPracticeTime')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xl font-semibold">{Array.isArray(practiceSessions) ? practiceSessions.length : 0}</div>
                    <p className="text-sm text-gray-600">{t('studentPortal.practice.sessions')}</p>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">
                      {Array.isArray(practiceSessions) && practiceSessions.length ? Math.round(totalMinutes / practiceSessions.length) : 0}m
                    </div>
                    <p className="text-sm text-gray-600">{t('studentPortal.practice.avgSession')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <span>{t('studentPortal.practice.recentSessions')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {recentSessions.map((session: any) => {
                    const duration = session.endTime
                      ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
                      : 0;

                    return (
                      <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {format(new Date(session.startTime), "MMM d, yyyy")}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(session.startTime), "h:mm a")}
                          </div>
                        </div>
                        <div className="text-right">
                          {session.endTime ? (
                            <Badge variant="outline">{duration}m</Badge>
                          ) : (
                            <Badge variant="secondary">{t('studentPortal.practice.activeBadge')}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">{t('studentPortal.practice.noSessions')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}