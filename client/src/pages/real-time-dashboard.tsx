import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Loader2, Users, Calendar, Bell, BarChart, Music, Clock, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function RealTimeDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Use real-time sync hook for live updates
  const {
    connectionInfo,
    isConnected,
    onlineUsers,
    recentActivity,
    refreshCache
  } = useRealtimeSync();

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: getQueryFn(),
  });

  // Calculate active students and teachers from real-time data
  const activeStudents = onlineUsers.filter(u => u.role === 'student').length;
  const activeTeachers = onlineUsers.filter(u => u.role === 'teacher').length;
  const recentPracticeEvents = recentActivity.filter(e => e.entity === 'practice').length;

  return (
    <div className="container py-6 max-w-7xl">
      {!user ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('realtimeDashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('realtimeDashboard.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Real-time connection status */}
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  {t('realtimeDashboard.statusLive')}
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  {connectionInfo.connecting ? t('realtimeDashboard.statusConnecting') : t('realtimeDashboard.statusOffline')}
                </>
              )}
            </Badge>
            {connectionInfo.error && (
              <Button variant="ghost" size="sm" onClick={() => refreshCache()} className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                {t('realtimeDashboard.retry')}
              </Button>
            )}
          </div>
          
          <div className="flex items-center bg-muted rounded-md px-3 py-1">
            <Clock className="h-4 w-4 mr-2 text-primary" />
            <span className="text-sm">
              {new Date().toLocaleString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        </div>
      </div>

      <Tabs 
        defaultValue="overview" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t('realtimeDashboard.tabOverview')}</TabsTrigger>
          <TabsTrigger value="practice">{t('realtimeDashboard.tabPractice')}</TabsTrigger>
          <TabsTrigger value="scheduling">{t('realtimeDashboard.tabScheduling')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <Users className="h-5 w-5 mr-2 text-primary" />
                <span className="text-sm font-medium">{t('realtimeDashboard.cardStudents')}</span>
              </div>
              <span className="text-2xl font-bold">{statsLoading ? '...' : stats?.studentCount || 0}</span>
              <span className="text-xs text-muted-foreground mt-1">{t('realtimeDashboard.cardStudentsSubtitle')}</span>
            </Card>
            
            <Card className="p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <Music className="h-5 w-5 mr-2 text-primary" />
                <span className="text-sm font-medium">{t('realtimeDashboard.cardSongs')}</span>
              </div>
              <span className="text-2xl font-bold">{statsLoading ? '...' : stats?.songCount || 0}</span>
              <span className="text-xs text-muted-foreground mt-1">{t('realtimeDashboard.cardSongsSubtitle')}</span>
            </Card>
            
            <Card className="p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                <span className="text-sm font-medium">{t('realtimeDashboard.cardThisWeek')}</span>
              </div>
              <span className="text-2xl font-bold">{statsLoading ? '...' : stats?.sessionCountThisWeek || 0}</span>
              <span className="text-xs text-muted-foreground mt-1">{t('realtimeDashboard.cardThisWeekSubtitle')}</span>
            </Card>
            
            <Card className="p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <BarChart className="h-5 w-5 mr-2 text-primary" />
                <span className="text-sm font-medium">{t('realtimeDashboard.cardCurrentlyActive')}</span>
              </div>
              <span className="text-2xl font-bold">{activeStudents}</span>
              <span className="text-xs text-muted-foreground mt-1">{t('realtimeDashboard.cardCurrentlyActiveSubtitle')}</span>
              {activeStudents > 0 && (
                <Button
                  variant="link"
                  className="text-xs p-0 h-auto mt-2 self-start"
                  onClick={() => setActiveTab("practice")}
                >
                  {t('realtimeDashboard.viewActivity')}
                </Button>
              )}
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center justify-between">
                  {t('realtimeDashboard.recentActivity')}
                  {isConnected && <Badge variant="outline" className="text-xs">{t('realtimeDashboard.liveBadge')}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {recentActivity.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {recentActivity.slice(0, 10).map((event, index) => (
                      <div key={index} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium">
                            {event.type === 'practice.start' && t('realtimeDashboard.eventPracticeStart')}
                            {event.type === 'practice.end' && t('realtimeDashboard.eventPracticeEnd')}
                            {event.type === 'student.update' && t('realtimeDashboard.eventStudentUpdate')}
                            {event.type === 'lesson.create' && t('realtimeDashboard.eventLessonCreate')}
                            {event.type === 'assignment.create' && t('realtimeDashboard.eventAssignmentCreate')}
                            {!event.type.includes('.') && event.type}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {event.data?.studentName || event.data?.lessonTitle || t('realtimeDashboard.systemUpdate')}
                            {' • '}
                            {new Date(event.meta.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {isConnected
                      ? t('realtimeDashboard.waitingActivity')
                      : t('realtimeDashboard.connectActivity')
                    }
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle>{t('realtimeDashboard.upcomingSchedule')}</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('realtimeDashboard.upcomingScheduleEmpty')}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setActiveTab("scheduling")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('realtimeDashboard.manageSchedule')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="practice">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="flex items-center justify-between">
                {t('realtimeDashboard.practiceMonitor')}
                {isConnected && <Badge variant="outline">{t('realtimeDashboard.liveUpdates')}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center mb-2">
                    <Users className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-sm font-medium">{t('realtimeDashboard.onlineStudents')}</span>
                  </div>
                  <span className="text-xl font-bold">{activeStudents}</span>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center mb-2">
                    <Users className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm font-medium">{t('realtimeDashboard.onlineTeachers')}</span>
                  </div>
                  <span className="text-xl font-bold">{activeTeachers}</span>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center mb-2">
                    <Music className="h-4 w-4 mr-2 text-purple-500" />
                    <span className="text-sm font-medium">{t('realtimeDashboard.recentPractice')}</span>
                  </div>
                  <span className="text-xl font-bold">{recentPracticeEvents}</span>
                </Card>
              </div>
              
              {onlineUsers.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">{t('realtimeDashboard.currentlyOnline')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {onlineUsers.map((user, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{user.username}</div>
                          <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {isConnected
                    ? t('realtimeDashboard.noUsersOnline')
                    : t('realtimeDashboard.connectToSeeUsers')
                  }
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduling">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>{t('realtimeDashboard.scheduleManagement')}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-8 text-center">
              <p className="text-muted-foreground">
                {t('realtimeDashboard.scheduleManagementEmpty')}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.href = "/schedule"}
              >
                {t('realtimeDashboard.goToSchedule')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
}