import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Student, Assignment, Session } from "@shared/schema";
import AppLayout from "@/components/layouts/app-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Award,
  ChevronLeft,
  Mail,
  Phone,
  Music,
  BookOpen,
  CalendarRange,
  Edit,
  Trash2,
  Calendar,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  NotebookPen,
  Clock,
  Zap,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import AchievementsTab from "./achievements-tab";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";

export default function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const studentId = parseInt(id);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Per-session teacher notes: track local edits before save
  const [pendingNotes, setPendingNotes] = useState<Record<number, string>>({});

  const { data: student, isLoading: isLoadingStudent } = useQuery<Student>({
    queryKey: [`/api/students/${studentId}`],
    enabled: !isNaN(studentId),
  });
  
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery<Assignment[]>({
    queryKey: [`/api/students/${studentId}/assignments`],
    enabled: !isNaN(studentId),
  });
  
  const { data: sessions, isLoading: isLoadingSessions } = useQuery<Session[]>({
    queryKey: [`/api/students/${studentId}/sessions`],
    enabled: !isNaN(studentId),
  });

  const { data: practiceLogs = [], isLoading: isLoadingPracticeLogs } = useQuery<any[]>({
    queryKey: [`/api/students/${studentId}/practice-sessions`],
    enabled: !isNaN(studentId),
  });
  
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      await apiRequest("DELETE", `/api/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/assignments`] });
      toast({
        title: t('studentDetails.assignments.deleted'),
        description: t('studentDetails.assignments.deletedDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('studentDetails.assignments.deleteFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/sessions`] });
      toast({
        title: t('studentDetails.sessions.deleted'),
        description: t('studentDetails.sessions.deletedDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('studentDetails.sessions.deleteFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: number; data: Record<string, unknown> }) => {
      return apiRequest("PUT", `/api/sessions/${sessionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/sessions`] });
    },
  });

  const saveTeacherNotes = (sessionId: number) => {
    const notes = pendingNotes[sessionId];
    if (notes === undefined) return;
    updateSessionMutation.mutate(
      { sessionId, data: { teacherNotes: notes } },
      {
        onSuccess: () => toast({ title: t('studentDetails.sessions.teacherNotes.saved') }),
      }
    );
  };

  const toggleAttendance = (session: Session) => {
    const newStatus = session.status === "completed" ? "noshow" : "completed";
    updateSessionMutation.mutate(
      { sessionId: session.id, data: { status: newStatus } },
      {
        onSuccess: () => toast({ title: t('studentDetails.sessions.attendance.saved') }),
      }
    );
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800';
      case 'advanced':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };
  
  const formatDate = (dateString: string | Date) => {
    return format(typeof dateString === 'string' ? new Date(dateString) : dateString, 'MMM d, yyyy');
  };
  
  const formatTime = (dateString: string | Date) => {
    return format(typeof dateString === 'string' ? new Date(dateString) : dateString, 'h:mm a');
  };
  
  if (isNaN(studentId)) {
    return (
      <AppLayout title={t('studentDetails.notFound')}>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold mb-4">{t('studentDetails.invalidId')}</h2>
          <Button asChild>
            <Link href="/students">
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t('studentDetails.backToStudents')}
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }
  
  if (isLoadingStudent) {
    return (
      <AppLayout title={t('studentDetails.loading')}>
        <div className="flex justify-center py-12">
          <p>{t('studentDetails.loadingMessage')}</p>
        </div>
      </AppLayout>
    );
  }
  
  if (!student) {
    return (
      <AppLayout title={t('studentDetails.notFound')}>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold mb-4">{t('studentDetails.notFoundMessage')}</h2>
          <Button asChild>
            <Link href="/students">
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t('studentDetails.backToStudents')}
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title={student.name}>
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/students">
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('studentDetails.backToStudents')}
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-xl bg-primary text-white">
                  {getInitials(student.name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold mb-1">{student.name}</h2>
              <Badge 
                variant="secondary" 
                className={getLevelBadgeColor(student.level)}
              >
                {student.level}
              </Badge>
              
              <Separator className="my-4" />
              
              <div className="w-full space-y-3">
                <div className="flex items-center">
                  <Music className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{student.instrument}</span>
                </div>
                {student.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="truncate">{student.email}</span>
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{student.phone}</span>
                  </div>
                )}
              </div>
              
              <div className="flex w-full mt-6 space-x-2">
                <Button variant="outline" className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </Button>
                <Button variant="destructive" className="flex-1">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="md:col-span-3">
          <Tabs defaultValue="assignments">
            <TabsList className="mb-4">
              <TabsTrigger value="assignments" className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                {t('studentDetails.tab.assignments')}
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {t('studentDetails.tab.sessions')}
              </TabsTrigger>
              <TabsTrigger value="achievements" className="flex items-center">
                <Award className="h-4 w-4 mr-2" />
                {t('studentDetails.tab.achievements')}
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center">
                <CalendarRange className="h-4 w-4 mr-2" />
                {t('studentDetails.tab.notes')}
              </TabsTrigger>
              <TabsTrigger value="practiceLog" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                {t('studentDetails.tab.practiceLog')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="assignments">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t('studentDetails.assignments.title')}</CardTitle>
                    <CardDescription>
                      {t('studentDetails.assignments.description', { name: student.name })}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('studentDetails.assignments.assignMaterial')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingAssignments ? (
                    <div className="flex justify-center py-8">
                      <p>{t('studentDetails.assignments.loading')}</p>
                    </div>
                  ) : assignments?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-gray-500 mb-4">{t('studentDetails.assignments.none')}</p>
                      <div className="flex space-x-2">
                        <Button variant="outline">
                          <Music className="h-4 w-4 mr-2" />
                          {t('studentDetails.assignments.assignSong')}
                        </Button>
                        <Button variant="outline">
                          <BookOpen className="h-4 w-4 mr-2" />
                          {t('studentDetails.assignments.assignLesson')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('studentDetails.assignments.col.type')}</TableHead>
                            <TableHead>{t('studentDetails.assignments.col.title')}</TableHead>
                            <TableHead>{t('studentDetails.assignments.col.assignedDate')}</TableHead>
                            <TableHead>{t('studentDetails.assignments.col.dueDate')}</TableHead>
                            <TableHead>{t('studentDetails.assignments.col.status')}</TableHead>
                            <TableHead className="text-right">{t('studentDetails.assignments.col.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignments?.map((assignment) => (
                            <TableRow key={assignment.id}>
                              <TableCell>
                                <Badge variant="outline">
{assignment.songId ? t('studentDetails.assignments.typeSong') : t('studentDetails.assignments.typeLesson')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {assignment.songId ? `Song ${assignment.songId}` : `Lesson ${assignment.lessonId}`}
                              </TableCell>
                              <TableCell>{formatDate(assignment.assignedDate)}</TableCell>
                              <TableCell>
                                {assignment.dueDate ? formatDate(assignment.dueDate) : t('studentDetails.assignments.notSet')}
                              </TableCell>
                              <TableCell>
                                {assignment.completedDate ? (
                                  <Badge className="bg-green-100 text-green-800">{t('studentDetails.assignments.completed')}</Badge>
                                ) : (
                                  <Badge variant="outline">{t('studentDetails.assignments.inProgress')}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Open menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Edit className="mr-2 h-4 w-4" />
                                      {t('studentDetails.assignments.editAssignment')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      {assignment.completedDate ? (
                                        <>
                                          <Calendar className="mr-2 h-4 w-4" />
                                          {t('studentDetails.assignments.markIncomplete')}
                                        </>
                                      ) : (
                                        <>
                                          <Calendar className="mr-2 h-4 w-4" />
                                          {t('studentDetails.assignments.markComplete')}
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                                      disabled={deleteAssignmentMutation.isPending}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      {t('studentDetails.assignments.deleteAssignment')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="achievements">
              {!isNaN(studentId) && <AchievementsTab studentId={studentId} />}
            </TabsContent>
            
            <TabsContent value="sessions">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t('studentDetails.sessions.title')}</CardTitle>
                    <CardDescription>
                      {t('studentDetails.sessions.description', { name: student.name })}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('studentDetails.sessions.scheduleSession')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-8">
                      <p>{t('studentDetails.sessions.loading')}</p>
                    </div>
                  ) : sessions?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-gray-500 mb-4">{t('studentDetails.sessions.none')}</p>
                      <Button>
                        <Calendar className="h-4 w-4 mr-2" />
                        {t('studentDetails.sessions.scheduleFirst')}
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('studentDetails.sessions.col.title')}</TableHead>
                            <TableHead>{t('studentDetails.sessions.col.date')}</TableHead>
                            <TableHead>{t('studentDetails.sessions.col.time')}</TableHead>
                            <TableHead>{t('studentDetails.sessions.col.duration')}</TableHead>
                            <TableHead>{t('studentDetails.sessions.col.attendance')}</TableHead>
                            <TableHead>{t('studentDetails.sessions.col.teacherNotes')}</TableHead>
                            <TableHead className="text-right">{t('studentDetails.sessions.col.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessions?.map((session) => (
                            <TableRow key={session.id}>
                              <TableCell>
                                <div className="font-medium">{session.title}</div>
                              </TableCell>
                              <TableCell>{formatDate(session.startTime)}</TableCell>
                              <TableCell>
                                {formatTime(session.startTime)} - {formatTime(session.endTime)}
                              </TableCell>
                              <TableCell>
                                {Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))} min
                              </TableCell>
                              <TableCell>
                                {session.status === "scheduled" || session.status === "vacation_blocked" ? (
                                  <Badge variant="outline" className="text-gray-500">—</Badge>
                                ) : session.status === "completed" ? (
                                  <button
                                    onClick={() => toggleAttendance(session)}
                                    className="flex items-center gap-1 text-green-700 hover:opacity-70 transition-opacity"
                                    title={t('studentDetails.sessions.attendance.markNoshow')}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-xs font-medium">{t('studentDetails.sessions.attendance.present')}</span>
                                  </button>
                                ) : session.status === "noshow" ? (
                                  <button
                                    onClick={() => toggleAttendance(session)}
                                    className="flex items-center gap-1 text-red-600 hover:opacity-70 transition-opacity"
                                    title={t('studentDetails.sessions.attendance.markPresent')}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-xs font-medium">{t('studentDetails.sessions.attendance.noshow')}</span>
                                  </button>
                                ) : (
                                  <Badge variant="outline" className="text-gray-400 capitalize">{session.status}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <Textarea
                                  className="text-xs min-h-[60px] resize-none border-dashed focus:border-solid"
                                  placeholder={t('studentDetails.sessions.teacherNotes.placeholder')}
                                  value={pendingNotes[session.id] ?? session.teacherNotes ?? ""}
                                  onChange={(e) =>
                                    setPendingNotes((prev) => ({ ...prev, [session.id]: e.target.value }))
                                  }
                                  onBlur={() => saveTeacherNotes(session.id)}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Open menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => toggleAttendance(session)}
                                      disabled={session.status === "scheduled" || session.status === "vacation_blocked"}
                                    >
                                      {session.status === "completed" ? (
                                        <>
                                          <XCircle className="mr-2 h-4 w-4" />
                                          {t('studentDetails.sessions.attendance.markNoshow')}
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                          {t('studentDetails.sessions.attendance.markPresent')}
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600"
                                      onClick={() => deleteSessionMutation.mutate(session.id)}
                                      disabled={deleteSessionMutation.isPending}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      {t('studentDetails.sessions.cancelSession')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>{t('studentDetails.notes.title')}</CardTitle>
                  <CardDescription>
                    {t('studentDetails.notes.description', { name: student.name })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {student.notes ? (
                      <p className="whitespace-pre-line">{student.notes}</p>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 mb-2">{t('studentDetails.notes.none')}</p>
                        <Button variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          {t('studentDetails.notes.addNotes')}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="practiceLog">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t('studentDetails.practiceLog.title')}
                  </CardTitle>
                  <CardDescription>
                    {t('studentDetails.practiceLog.description', { name: student.name })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingPracticeLogs ? (
                    <div className="flex justify-center py-8">
                      <p>{t('common.loading')}</p>
                    </div>
                  ) : practiceLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                      <Clock className="h-10 w-10 mb-2 opacity-30" />
                      <p>{t('studentDetails.practiceLog.empty')}</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('studentDetails.practiceLog.col.date')}</TableHead>
                            <TableHead>{t('studentDetails.practiceLog.col.duration')}</TableHead>
                            <TableHead className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-yellow-500" />
                              {t('studentDetails.practiceLog.col.xp')}
                            </TableHead>
                            <TableHead>{t('studentDetails.practiceLog.col.notes')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {practiceLogs.map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell>{formatDate(log.startTime)}</TableCell>
                              <TableCell>
                                {t('studentDetails.practiceLog.minutes', { n: String(log.duration ?? "?") })}
                              </TableCell>
                              <TableCell>
                                {log.xpAwarded ? (
                                  <span className="text-yellow-600 font-medium">+{log.xpAwarded}</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-600">{log.notes || "—"}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
