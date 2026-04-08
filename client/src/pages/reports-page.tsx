import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { 
  BarChart3,
  TrendingUp,
  Users,
  Music,
  BookOpen,
  Calendar,
  Download,
  Filter,
  Trophy,
  Clock
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import AppLayout from "@/components/layouts/app-layout";

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

export default function ReportsPage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('overview');

  // Fetch report data
  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ['/api/reports', dateRange, reportType],
    queryFn: async () => {
      const response = await fetch(`/api/reports?range=${dateRange}&type=${reportType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      return response.json();
    }
  });

  const handleExportReport = () => {
    // Generate CSV export
    const csvData = generateCSVReport(reportData);
    downloadCSV(csvData, `music-school-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">{t('reports.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout title={t('reports.title')}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
          <p className="text-gray-600">{t('reports.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('reports.dateRange.last7')}</SelectItem>
              <SelectItem value="30">{t('reports.dateRange.last30')}</SelectItem>
              <SelectItem value="90">{t('reports.dateRange.last3months')}</SelectItem>
              <SelectItem value="365">{t('reports.dateRange.lastYear')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">{t('reports.type.overview')}</SelectItem>
              <SelectItem value="students">{t('reports.type.students')}</SelectItem>
              <SelectItem value="lessons">{t('reports.type.lessons')}</SelectItem>
              <SelectItem value="assignments">{t('reports.type.assignments')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleExportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('reports.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('reports.metric.totalStudents')}</p>
                <p className="text-2xl font-bold">{reportData?.totalStudents || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">{t('reports.metric.totalStudentsTrend')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('reports.metric.activeLessons')}</p>
                <p className="text-2xl font-bold">{reportData?.activeLessons || 0}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">{t('reports.metric.activeLessonsTrend')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('reports.metric.completedAssignments')}</p>
                <p className="text-2xl font-bold">{reportData?.completedAssignments || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">{t('reports.metric.completedAssignmentsTrend')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('reports.metric.upcomingSessions')}</p>
                <p className="text-2xl font-bold">{reportData?.upcomingSessions || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Clock className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-blue-600">{t('reports.metric.upcomingSessionsPeriod')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Progress Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('reports.studentProgress.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportData?.studentProgress && reportData.studentProgress.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.studentProgress.colStudent')}</TableHead>
                    <TableHead>{t('reports.studentProgress.colCompletedLessons')}</TableHead>
                    <TableHead>{t('reports.studentProgress.colAssignments')}</TableHead>
                    <TableHead>{t('reports.studentProgress.colXp')}</TableHead>
                    <TableHead>{t('reports.studentProgress.colLastActivity')}</TableHead>
                    <TableHead>{t('reports.studentProgress.colProgress')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.studentProgress.map((student) => {
                    const completionRate = student.totalAssignments > 0 
                      ? Math.round((student.completedAssignments / student.totalAssignments) * 100)
                      : 0;
                    
                    return (
                      <TableRow key={student.studentId}>
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
                          {student.lastActivity ? format(new Date(student.lastActivity), 'MMM dd, yyyy') : t('reports.studentProgress.never')}
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
              <p>{t('reports.studentProgress.empty')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular Lessons & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              {t('reports.popularLessons.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData?.popularLessons && reportData.popularLessons.length > 0 ? (
              <div className="space-y-4">
                {reportData.popularLessons.map((lesson, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{lesson.lessonTitle}</p>
                      <p className="text-sm text-gray-600">{lesson.completions} {t('reports.popularLessons.completions')}</p>
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
                <p>{t('reports.popularLessons.empty')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('reports.upcomingDeadlines.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData?.upcomingDeadlines && reportData.upcomingDeadlines.length > 0 ? (
              <div className="space-y-4">
                {reportData.upcomingDeadlines.map((deadline, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{deadline.studentName}</p>
                      <p className="text-sm text-gray-600">{deadline.assignmentTitle}</p>
                      <p className="text-xs text-gray-500">
                        {t('reports.upcomingDeadlines.due')} {format(new Date(deadline.dueDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge 
                      variant={deadline.status === 'overdue' ? 'destructive' : 'secondary'}
                    >
                      {deadline.status === 'overdue' ? t('reports.upcomingDeadlines.statusOverdue') : t('reports.upcomingDeadlines.statusPending')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>{t('reports.upcomingDeadlines.empty')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </AppLayout>
  );
}