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
  MoreHorizontal
} from "lucide-react";
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

export default function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const studentId = parseInt(id);
  const { toast } = useToast();
  
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
  
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      await apiRequest("DELETE", `/api/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/assignments`] });
      toast({
        title: "Assignment deleted",
        description: "The assignment has been successfully removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete assignment",
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
        title: "Session deleted",
        description: "The scheduled session has been successfully removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete session",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
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
      <AppLayout title="Student Not Found">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold mb-4">Invalid Student ID</h2>
          <Button asChild>
            <Link href="/students">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Students
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }
  
  if (isLoadingStudent) {
    return (
      <AppLayout title="Loading Student...">
        <div className="flex justify-center py-12">
          <p>Loading student information...</p>
        </div>
      </AppLayout>
    );
  }
  
  if (!student) {
    return (
      <AppLayout title="Student Not Found">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold mb-4">Student not found</h2>
          <Button asChild>
            <Link href="/students">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Students
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
            Back to Students
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
                  Edit
                </Button>
                <Button variant="destructive" className="flex-1">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
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
                Assignments
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="achievements" className="flex items-center">
                <Award className="h-4 w-4 mr-2" />
                Achievements
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center">
                <CalendarRange className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="assignments">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Assignments</CardTitle>
                    <CardDescription>
                      Track songs and lessons assigned to {student.name}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Material
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingAssignments ? (
                    <div className="flex justify-center py-8">
                      <p>Loading assignments...</p>
                    </div>
                  ) : assignments?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-gray-500 mb-4">No assignments found</p>
                      <div className="flex space-x-2">
                        <Button variant="outline">
                          <Music className="h-4 w-4 mr-2" />
                          Assign Song
                        </Button>
                        <Button variant="outline">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Assign Lesson
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Assigned Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignments?.map((assignment) => (
                            <TableRow key={assignment.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  {assignment.songId ? "Song" : "Lesson"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {assignment.songId ? `Song ${assignment.songId}` : `Lesson ${assignment.lessonId}`}
                              </TableCell>
                              <TableCell>{formatDate(assignment.assignedDate)}</TableCell>
                              <TableCell>
                                {assignment.dueDate ? formatDate(assignment.dueDate) : "Not set"}
                              </TableCell>
                              <TableCell>
                                {assignment.completedDate ? (
                                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                ) : (
                                  <Badge variant="outline">In Progress</Badge>
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
                                      Edit assignment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      {assignment.completedDate ? (
                                        <>
                                          <Calendar className="mr-2 h-4 w-4" />
                                          Mark as incomplete
                                        </>
                                      ) : (
                                        <>
                                          <Calendar className="mr-2 h-4 w-4" />
                                          Mark as complete
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                                      disabled={deleteAssignmentMutation.isPending}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete assignment
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
                    <CardTitle>Scheduled Sessions</CardTitle>
                    <CardDescription>
                      Upcoming and past lessons with {student.name}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Session
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-8">
                      <p>Loading sessions...</p>
                    </div>
                  ) : sessions?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-gray-500 mb-4">No sessions scheduled</p>
                      <Button>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule First Session
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
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
                                <div className="max-w-xs truncate">
                                  {session.notes || "No notes"}
                                </div>
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
                                      Edit session
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" 
                                      onClick={() => deleteSessionMutation.mutate(session.id)} 
                                      disabled={deleteSessionMutation.isPending}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Cancel session
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
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>
                    Additional information about {student.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {student.notes ? (
                      <p className="whitespace-pre-line">{student.notes}</p>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 mb-2">No notes available</p>
                        <Button variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          Add Notes
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
