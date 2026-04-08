import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppLayout from "@/components/layouts/app-layout";
import { useTranslation } from "@/lib/i18n";
import { 
  Users, 
  Music, 
  BookOpen, 
  TrendingUp,
  Activity,
  Clock
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Bar, BarChart } from "recharts";

interface SchoolStats {
  total_teachers: number;
  total_students: number;
  total_lessons: number;
  total_songs: number;
  total_sessions: number;
  new_students_this_month: number;
  sessions_this_month: number;
}

interface StudentActivity {
  id: number;
  student_name: string;
  practice_count: number;
  total_practice_time: number;
  last_practice_date: string | null;
  last_login_at: string | null;
}

interface PerformanceTrend {
  month: string;
  active_students: number;
  total_sessions: number;
  total_duration: number;
}

export default function SchoolDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading: statsLoading } = useQuery<SchoolStats>({
    queryKey: ["/api/school/dashboard-stats"],
  });

  const { data: studentActivity } = useQuery<StudentActivity[]>({
    queryKey: ["/api/school/student-activity"],
  });

  const { data: performanceTrends, isLoading: trendsLoading } = useQuery<PerformanceTrend[]>({
    queryKey: ["/api/school/performance-trends"],
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <AppLayout title={t('schoolDashboard.title')}>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('schoolDashboard.title')}</h1>
            <p className="text-muted-foreground">
              {t('schoolDashboard.subtitle')}
            </p>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('schoolDashboard.stats.totalStudents')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.total_students || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +{stats?.new_students_this_month || 0} {t('schoolDashboard.stats.thisMonth')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('schoolDashboard.stats.teachers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.total_teachers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('schoolDashboard.stats.activeInstructors')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('schoolDashboard.stats.lessons')}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.total_lessons || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('schoolDashboard.stats.totalLessonLibrary')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('schoolDashboard.stats.songs')}</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.total_songs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('schoolDashboard.stats.songRepertoire')}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">{t('schoolDashboard.tab.studentActivity')}</TabsTrigger>
            <TabsTrigger value="performance">{t('schoolDashboard.tab.performanceTrends')}</TabsTrigger>
            <TabsTrigger value="overview">{t('schoolDashboard.tab.schoolOverview')}</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('schoolDashboard.activity.title')}</CardTitle>
                <CardDescription>{t('schoolDashboard.activity.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentActivity?.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{student.student_name}</h4>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{student.practice_count || 0} {t('schoolDashboard.activity.sessions')}</span>
                          <span>{formatDuration(student.total_practice_time || 0)} {t('schoolDashboard.activity.practiced')}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm">
                          {student.last_practice_date
                            ? new Date(student.last_practice_date).toLocaleDateString()
                            : t('schoolDashboard.activity.noPractice')}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {student.last_login_at
                              ? `${t('schoolDashboard.activity.lastSeen')} ${new Date(student.last_login_at).toLocaleDateString()}`
                              : t('schoolDashboard.activity.neverLoggedIn')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!studentActivity?.length && (
                    <p className="text-center text-muted-foreground py-8">
                      {t('schoolDashboard.activity.noData')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('schoolDashboard.performance.title')}</CardTitle>
                <CardDescription>{t('schoolDashboard.performance.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {t('schoolDashboard.performance.loadingTrends')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceTrends ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="active_students"
                        stroke="#2563eb"
                        name={t('schoolDashboard.performance.activeStudents')}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_sessions"
                        stroke="#10b981"
                        name={t('schoolDashboard.performance.totalSessions')}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('schoolDashboard.practiceDuration.title')}</CardTitle>
                <CardDescription>{t('schoolDashboard.practiceDuration.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    {t('schoolDashboard.practiceDuration.loading')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceTrends ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [formatDuration(value as number), t('schoolDashboard.practiceDuration.practiceTime')]}
                      />
                      <Bar dataKey="total_duration" fill="#2563eb" name={t('schoolDashboard.practiceDuration.practiceDuration')} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{t('schoolDashboard.overview.thisMonthActivity')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('schoolDashboard.overview.practiceSessions')}</span>
                    <span className="font-medium">{stats?.sessions_this_month || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('schoolDashboard.overview.newStudents')}</span>
                    <span className="font-medium">{stats?.new_students_this_month || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('schoolDashboard.overview.totalSessionsAllTime')}</span>
                    <span className="font-medium">{stats?.total_sessions || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{t('schoolDashboard.overview.contentLibrary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('schoolDashboard.overview.totalLessons')}</span>
                    <span className="font-medium">{stats?.total_lessons || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('schoolDashboard.overview.totalSongs')}</span>
                    <span className="font-medium">{stats?.total_songs || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('schoolDashboard.overview.activeTeachers')}</span>
                    <span className="font-medium">{stats?.total_teachers || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
