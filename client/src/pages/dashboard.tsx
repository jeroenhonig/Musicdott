import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from '@/lib/i18n';
import Layout from "@/components/layouts/app-layout";
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Music, BookOpen, Calendar, Building, Crown, Shield, TrendingUp, Activity, UserCog, Video, ExternalLink } from "lucide-react";
import GrooveDisplay from "@/components/groove-display";
import { StudentProgressWidget, PracticeTimer } from "@/components/gamification/student-progress";
import { ClassLeaderboard } from "@/components/gamification/leaderboard";
import { apiRequest } from "@/lib/queryClient";
import RequireRole, { RequireTeacher, RequireSchoolOwner } from "@/components/rbac/require-role";
import RoleIndicator from "@/components/rbac/role-indicator";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { 
    user, 
    currentSchool, 
    isPlatformOwner, 
    isSchoolOwner, 
    isTeacher, 
    isStudent 
  } = useAuth();
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();

  // Redirect platform owners to their dedicated dashboard
  useEffect(() => {
    if (user && isPlatformOwner()) {
      setLocation("/owners-dashboard");
    }
  }, [user, isPlatformOwner, setLocation]);

  // Basic dashboard data
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user
  });

  // Platform-wide stats for platform owners
  const { data: platformStats } = useQuery({
    queryKey: ['/api/admin/platform-stats'],
    enabled: isPlatformOwner()
  });

  // Recent lessons and songs for teachers/school owners
  const { data: recentLessons, isLoading: lessonsLoading } = useQuery<any[]>({
    queryKey: ['/api/lessons/recent'],
    enabled: isTeacher() || isSchoolOwner()
  });

  const { data: recentSongs, isLoading: songsLoading } = useQuery<any[]>({
    queryKey: ['/api/songs/recent'],
    enabled: isTeacher() || isSchoolOwner()
  });

  const handleMinuteLogged = async () => {
    try {
      await apiRequest('/api/gamification/events', 'POST', {
        ruleKey: 'timer.minute_logged',
        idempotencyKey: `practice_${user?.id}_${Date.now()}`
      });
    } catch (error) {
      console.error('Failed to log practice minute:', error);
    }
  };

  const getDashboardTitle = () => {
    if (isPlatformOwner()) return "Platform Dashboard";
    if (isSchoolOwner()) return `${currentSchool?.name || 'School'} Dashboard`;
    if (isTeacher()) return "Teacher Dashboard";
    return "My Dashboard";
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Layout title={getDashboardTitle()}>
      <div className="space-y-6">
        {/* Role Indicator Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getDashboardTitle()}</h1>
            <div className="flex items-center gap-2 mt-1">
              <RoleIndicator size="sm" />
              {currentSchool && (
                <span className="text-sm text-muted-foreground">
                  • {currentSchool.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tool Button Bar - Available for Everyone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GrooveScribe Tool */}
          <a
            href="https://www.mikeslessons.com/groove/?TimeSig=4/4&Div=16&Tempo=80&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-------o-------|"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 block"
            data-testid="link-groovescribe-tool"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-lg bg-blue-50 p-3 group-hover:bg-blue-100 transition-colors">
                <Music className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">GrooveScribe</h3>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <p className="text-sm text-gray-600">
                  Convert drum patterns and create interactive groove embeds
                </p>
              </div>
            </div>
          </a>

          {/* Musicdott Sync Tool */}
          <a
            href="https://sync.musicdott.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-md hover:border-purple-300 hover:-translate-y-0.5 block"
            data-testid="link-sync-tool"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-lg bg-purple-50 p-3 group-hover:bg-purple-100 transition-colors">
                <Video className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">Musicdott Sync</h3>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <p className="text-sm text-gray-600">
                  Synchronize video with sheet music for interactive lessons
                </p>
              </div>
            </div>
          </a>
        </div>

        {/* Student Dashboard */}
        <RequireRole roles={['student']}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <StudentProgressWidget />
              <PracticeTimer onMinuteLogged={handleMinuteLogged} />
            </div>
            <div>
              <ClassLeaderboard classId="1" />
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                Start practicing to see your activity here!
              </div>
            </CardContent>
          </Card>
        </RequireRole>

        {/* Platform Owner Dashboard */}
        <RequirePlatformOwner>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(platformStats as any)?.totalSchools || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(platformStats as any)?.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{(platformStats as any)?.monthlyRevenue || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(platformStats as any)?.activeSessions || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Schools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-500 py-8">
                  <Building className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Platform analytics coming soon</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-500 py-8">
                  <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">All systems operational</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </RequirePlatformOwner>

        {/* Teacher/School Owner Dashboard */}
        <RequireTeacher>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats as any)?.students || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Songs</CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats as any)?.songs || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lessons</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats as any)?.lessons || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats as any)?.categories || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Lessons</CardTitle>
              </CardHeader>
              <CardContent>
                {lessonsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : recentLessons && recentLessons.length > 0 ? (
                  <div className="space-y-3">
                    {recentLessons.slice(0, 5).map((lesson: any) => (
                      <div key={lesson.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => setLocation(`/lessons/${lesson.id}`)}>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{lesson.title}</h4>
                          <p className="text-xs text-gray-500">{lesson.level || 'All levels'}</p>
                        </div>
                        <div className="text-xs text-gray-400">
                          {lesson.createdAt ? new Date(lesson.createdAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                    ))}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-3" 
                      onClick={() => setLocation('/lessons')}
                    >
                      View All Lessons
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No lessons created yet</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2" 
                      onClick={() => setLocation('/lessons')}
                      data-testid="button-create-first-lesson"
                    >
                      Create First Lesson
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Songs</CardTitle>
              </CardHeader>
              <CardContent>
                {songsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : recentSongs && recentSongs.length > 0 ? (
                  <div className="space-y-3">
                    {recentSongs.slice(0, 5).map((song: any) => (
                      <div key={song.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => setLocation(`/songs/${song.id}`)}>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{song.title}</h4>
                          <p className="text-xs text-gray-500">{song.artist ? `by ${song.artist}` : (song.level || 'All levels')}</p>
                        </div>
                        <div className="text-xs text-gray-400">
                          {song.createdAt ? new Date(song.createdAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                    ))}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-3" 
                      onClick={() => setLocation('/songs')}
                    >
                      View All Songs
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Music className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No songs created yet</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2" 
                      onClick={() => setLocation('/songs')}
                      data-testid="button-create-first-song"
                    >
                      Create First Song
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* School Owner Specific Stats */}
          <RequireSchoolOwner>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 mt-6 border-t border-gray-200">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">School Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation('/school/members')}
                    data-testid="button-manage-members"
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation('/branding')}
                    data-testid="button-school-settings"
                  >
                    <Building className="h-4 w-4 mr-2" />
                    School Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Billing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€{(stats as any)?.monthlyBill || 0}</div>
                  <p className="text-xs text-muted-foreground">Monthly charges</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(stats as any)?.activeStudents || 0}</div>
                  <p className="text-xs text-muted-foreground">Active this month</p>
                </CardContent>
              </Card>
            </div>
          </RequireSchoolOwner>
        </RequireTeacher>
      </div>
    </Layout>
  );
}