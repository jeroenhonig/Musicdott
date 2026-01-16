import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppLayout from "@/components/layouts/app-layout";
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
    <AppLayout title="School Dashboard">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">School Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your school's performance and student activity
            </p>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.total_students || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +{stats?.new_students_this_month || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.total_teachers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active instructors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lessons</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.total_lessons || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total lesson library
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Songs</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.total_songs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Song repertoire
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">Student Activity</TabsTrigger>
            <TabsTrigger value="performance">Performance Trends</TabsTrigger>
            <TabsTrigger value="overview">School Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Student Activity</CardTitle>
                <CardDescription>Most active students and their practice sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentActivity?.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{student.student_name}</h4>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{student.practice_count || 0} sessions</span>
                          <span>{formatDuration(student.total_practice_time || 0)} practiced</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm">
                          {student.last_practice_date 
                            ? new Date(student.last_practice_date).toLocaleDateString()
                            : "No practice yet"}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {student.last_login_at 
                              ? `Last seen ${new Date(student.last_login_at).toLocaleDateString()}`
                              : "Never logged in"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!studentActivity?.length && (
                    <p className="text-center text-muted-foreground py-8">
                      No student activity data available yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Student engagement over the past 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Loading trends...
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
                        name="Active Students" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total_sessions" 
                        stroke="#10b981" 
                        name="Total Sessions" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Practice Duration Trends</CardTitle>
                <CardDescription>Total practice time per month</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Loading practice data...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceTrends ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [formatDuration(value as number), "Practice Time"]} 
                      />
                      <Bar dataKey="total_duration" fill="#2563eb" name="Practice Duration" />
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
                  <CardTitle className="text-sm font-medium">This Month's Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Practice Sessions</span>
                    <span className="font-medium">{stats?.sessions_this_month || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">New Students</span>
                    <span className="font-medium">{stats?.new_students_this_month || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Sessions (All Time)</span>
                    <span className="font-medium">{stats?.total_sessions || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Content Library</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Lessons</span>
                    <span className="font-medium">{stats?.total_lessons || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Songs</span>
                    <span className="font-medium">{stats?.total_songs || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Teachers</span>
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
