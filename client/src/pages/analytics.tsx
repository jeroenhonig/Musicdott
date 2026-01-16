import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3,
  TrendingUp,
  Users,
  Music,
  BookOpen,
  Calendar,
  Download,
  Trophy,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import AppLayout from "@/components/layouts/app-layout";
import { RequireTeacher } from "@/components/rbac/require-role";
import { useAuth } from "@/hooks/use-auth";

interface ReportData {
  totalStudents: number;
  activeLessons: number;
  completedAssignments: number;
  upcomingSessions: number;
  studentProgress: Array<{
    studentId: number;
    studentName: string;
    completedLessons: number;
    totalAssignments: number;
    completedAssignments: number;
    lastActivity: string;
    xpEarned: number;
  }>;
  lessonCompletions: Array<{
    date: string;
    completions: number;
  }>;
  popularLessons: Array<{
    lessonTitle: string;
    completions: number;
    avgRating?: number;
  }>;
  upcomingDeadlines: Array<{
    studentName: string;
    assignmentTitle: string;
    dueDate: string;
    status: 'pending' | 'overdue';
  }>;
}

interface PerformanceMetrics {
  totalLessons: number;
  averageCreationTime: number;
  successRate: number;
  failureRate: number;
  recentActivity: {
    date: string;
    lessonsCreated: number;
    averageTime: number;
  }[];
  contentBlockDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  userEngagement: {
    activeUsers: number;
    lessonsPerUser: number;
    topCategories: string[];
  };
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // SECURITY: Get user auth context to prevent unauthorized queries
  const { user, isTeacher, isSchoolOwner, isPlatformOwner } = useAuth();
  
  // Only allow analytics queries for teachers and above - prevents students from hitting APIs
  const canAccessAnalytics = user && (isTeacher() || isSchoolOwner() || isPlatformOwner());

  // Fetch unified analytics data - SECURE: Only query if user has proper role
  const { data: reportData, isLoading: reportLoading } = useQuery<ReportData>({
    queryKey: ['/api/reports', dateRange, reportType, refreshKey],
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: canAccessAnalytics, // SECURITY: Prevent unauthorized queries
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/performance/lessons', refreshKey],
    refetchInterval: 30000,
    enabled: canAccessAnalytics, // SECURITY: Prevent unauthorized queries
  });

  const { data: realtimeStats } = useQuery<{
    activeSessions?: number;
    lessonsToday?: number;
    avgResponseTime?: number;
  }>({
    queryKey: ['/api/performance/realtime'],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time data
    enabled: canAccessAnalytics, // SECURITY: Prevent unauthorized queries
  });

  const isLoading = reportLoading || performanceLoading;

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExportReport = () => {
    const csvData = generateCSVReport(reportData);
    downloadCSV(csvData, `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const generateCSVReport = (data: ReportData | undefined) => {
    if (!data) return '';
    
    const headers = ['Student Name', 'Completed Lessons', 'Total Assignments', 'Completed Assignments', 'XP Earned', 'Last Activity'];
    const rows = data.studentProgress.map(student => [
      student.studentName,
      student.completedLessons.toString(),
      student.totalAssignments.toString(),
      student.completedAssignments.toString(),
      student.xpEarned.toString(),
      student.lastActivity
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getPerformanceStatus = (successRate: number) => {
    if (successRate >= 95) return { label: 'Excellent', color: 'bg-green-500' };
    if (successRate >= 85) return { label: 'Good', color: 'bg-blue-500' };
    if (successRate >= 70) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Poor', color: 'bg-red-500' };
  };

  if (isLoading) {
    return (
      <AppLayout title="Analytics & Performance">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Analytics & Performance">
      <RequireTeacher fallback={<div className="p-6"><div className="text-center text-red-500">Access denied. Teacher privileges required.</div></div>}>
        <div className="space-y-6" data-testid="analytics-container">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="analytics-title">
              Analytics & Performance
            </h1>
            <p className="text-gray-600" data-testid="analytics-subtitle">
              Comprehensive insights into student progress and system performance
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32" data-testid="select-daterange">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-40" data-testid="select-reporttype">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="students">Student Progress</SelectItem>
                <SelectItem value="lessons">Lesson Analytics</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button onClick={handleExportReport} variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Unified Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="students" data-testid="tab-students">Students</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
            <TabsTrigger value="realtime" data-testid="tab-realtime">Real-time</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card data-testid="metric-students">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-2xl font-bold">{reportData?.totalStudents || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">Active students</span>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="metric-lessons">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Lessons</p>
                      <p className="text-2xl font-bold">{reportData?.activeLessons || 0}</p>
                    </div>
                    <BookOpen className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">Available content</span>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="metric-assignments">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed Assignments</p>
                      <p className="text-2xl font-bold">{reportData?.completedAssignments || 0}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">Student achievements</span>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="metric-sessions">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Upcoming Sessions</p>
                      <p className="text-2xl font-bold">{reportData?.upcomingSessions || 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <Clock className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-blue-600">Next 7 days</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Popular Lessons & Upcoming Deadlines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="popular-lessons">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Popular Lessons
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData?.popularLessons && reportData.popularLessons.length > 0 ? (
                    <div className="space-y-4">
                      {reportData.popularLessons.map((lesson, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`popular-lesson-${index}`}>
                          <div className="flex-1">
                            <p className="font-medium">{lesson.lessonTitle}</p>
                            <p className="text-sm text-gray-600">{lesson.completions} completions</p>
                          </div>
                          {lesson.avgRating && typeof lesson.avgRating === 'number' && (
                            <Badge variant="secondary">
                              ⭐ {lesson.avgRating.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No lesson data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="upcoming-deadlines">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData?.upcomingDeadlines && reportData.upcomingDeadlines.length > 0 ? (
                    <div className="space-y-4">
                      {reportData.upcomingDeadlines.map((deadline, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`deadline-${index}`}>
                          <div className="flex-1">
                            <p className="font-medium">{deadline.studentName}</p>
                            <p className="text-sm text-gray-600">{deadline.assignmentTitle}</p>
                            <p className="text-xs text-gray-500">Due: {format(new Date(deadline.dueDate), 'MMM dd, yyyy')}</p>
                          </div>
                          <Badge variant={deadline.status === 'overdue' ? 'destructive' : 'secondary'}>
                            {deadline.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No upcoming deadlines</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card data-testid="student-progress-table">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Student Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData?.studentProgress && reportData.studentProgress.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Completed Lessons</TableHead>
                          <TableHead>Assignments</TableHead>
                          <TableHead>XP Earned</TableHead>
                          <TableHead>Last Activity</TableHead>
                          <TableHead>Progress</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.studentProgress.map((student) => {
                          const completionRate = student.totalAssignments > 0 
                            ? Math.round((student.completedAssignments / student.totalAssignments) * 100)
                            : 0;
                          
                          return (
                            <TableRow key={student.studentId} data-testid={`student-row-${student.studentId}`}>
                              <TableCell className="font-medium">{student.studentName}</TableCell>
                              <TableCell>{student.completedLessons}</TableCell>
                              <TableCell>
                                {student.completedAssignments} / {student.totalAssignments}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  <Trophy className="h-3 w-3 mr-1" />
                                  {student.xpEarned} XP
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {student.lastActivity !== 'Never' ? format(new Date(student.lastActivity), 'MMM dd, yyyy') : 'Never'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full transition-all"
                                      style={{ width: `${completionRate}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-gray-600">{completionRate}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No student data available for the selected period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            {performanceData && (
              <>
                {/* Performance Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card data-testid="perf-total-lessons">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{performanceData.totalLessons || 0}</div>
                      <p className="text-xs text-muted-foreground">All time lesson count</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="perf-creation-time">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Creation Time</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {performanceData.averageCreationTime ? `${(performanceData.averageCreationTime / 1000).toFixed(1)}s` : '0s'}
                      </div>
                      <p className="text-xs text-muted-foreground">Per lesson creation</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="perf-success-rate">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{performanceData.successRate || 0}%</div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Progress value={performanceData.successRate || 0} className="flex-1" />
                        <Badge variant={getPerformanceStatus(performanceData.successRate || 0).label === 'Excellent' ? 'default' : 'secondary'}>
                          {getPerformanceStatus(performanceData.successRate || 0).label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="perf-active-users">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{performanceData.userEngagement?.activeUsers || 0}</div>
                      <p className="text-xs text-muted-foreground">Creating lessons this week</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Alerts */}
                {performanceData.averageCreationTime > 3000 && (
                  <Alert variant="destructive" data-testid="perf-alert-slow">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Performance Alert:</strong> Average lesson creation time is {(performanceData.averageCreationTime / 1000).toFixed(1)}s. Consider optimizing content blocks.
                    </AlertDescription>
                  </Alert>
                )}

                {performanceData.failureRate > 5 && (
                  <Alert variant="destructive" data-testid="perf-alert-failure">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>High Failure Rate:</strong> {performanceData.failureRate}% of lesson creations are failing. Check validation rules.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </TabsContent>

          {/* Real-time Tab */}
          <TabsContent value="realtime">
            <Card data-testid="realtime-stats">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Real-time Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {realtimeStats ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {realtimeStats?.activeSessions || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Active Sessions</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {realtimeStats?.lessonsToday || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Lessons Today</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {realtimeStats?.avgResponseTime || 0}ms
                      </div>
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Real-time data not available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </RequireTeacher>
    </AppLayout>
  );
}