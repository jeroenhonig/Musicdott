import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, addDays, parseISO, addMinutes } from "date-fns";
import { RecurringSchedule, Student, User } from "@shared/schema";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Clock, User as UserIcon, MapPin, AlertTriangle, Plus, Trash2, List, ChevronLeft, ChevronRight, X, Calendar, LayoutGrid, Timer } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layouts/app-layout";
import InteractiveCalendar from "@/components/scheduling/interactive-calendar";
import ICalImportExport from "@/components/scheduling/ical-import-export";
import { useAuth } from "@/hooks/use-auth";

const scheduleFormSchema = z.object({
  studentId: z.number().min(1, "Please select a student"),
  dayOfWeek: z.string().min(1, "Please select a day"), // dayOfWeek is text in database
  startTime: z.string().min(1, "Please enter start time"),
  endTime: z.string().min(1, "Please enter end time"),
  durationMin: z.number().min(5, "Duration must be at least 5 minutes").optional(),
  useDuration: z.boolean().default(true),
  userId: z.number().min(1, "Please select a teacher"), // database uses userId, not teacherId
  frequency: z.enum(["WEEKLY", "BIWEEKLY"]), // database uses frequency, not recurrenceType
  location: z.string().optional(),
  notes: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = 8 + i;
  return `${hour.toString().padStart(2, '0')}:00`;
});

interface ConflictInfo {
  existing: RecurringSchedule;
  conflictType: 'overlap' | 'adjacent';
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedSchedule, setSelectedSchedule] = useState<RecurringSchedule | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [activeView, setActiveView] = useState<'table' | 'calendar'>('calendar');

  // Early return if user is not loaded
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading user...</p>
        </div>
      </div>
    );
  }

  // Fetch data - Always call hooks, use enabled for conditional fetching
  const { data: schedules = [], isLoading: schedulesLoading, error: schedulesError } = useQuery<RecurringSchedule[]>({
    queryKey: ["/api/recurring-schedules"],
    enabled: !!user,
  });

  const { data: students = [], isLoading: studentsLoading, error: studentsError } = useQuery<Student[]>({
    queryKey: ["/api/students"], 
    enabled: !!user,
  });

  const { data: teachers = [], isLoading: teachersLoading, error: teachersError } = useQuery<User[]>({
    queryKey: ["/api/users/teachers"],
    enabled: !!user,
  });

  // Fetch sessions for individual lesson management
  const { data: sessions = [], isLoading: sessionsLoading, error: sessionsError } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
    enabled: !!user,
  });

  // Helper function to get student name
  const getStudentName = (studentId: number) => {
    // Safety checks
    if (!studentId || typeof studentId !== 'number') {
      return "Unknown Student";
    }
    
    if (!students || !Array.isArray(students)) {
      return "Loading...";
    }
    
    const student = students.find(s => s && s.id === studentId);
    return student?.name || "Unknown Student";
  };

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationMin: number) => {
    try {
      if (!startTime || !durationMin || typeof startTime !== 'string') return "";
      
      const timeParts = startTime.split(':');
      if (timeParts.length !== 2) return "";
      
      const [hours, minutes] = timeParts.map(Number);
      if (isNaN(hours) || isNaN(minutes) || isNaN(durationMin)) return "";
      
      const totalMinutes = hours * 60 + minutes + durationMin;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.warn('Error calculating end time:', error);
      return "";
    }
  };

  // Form setup
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      studentId: 0,
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "09:30",
      durationMin: 30,
      useDuration: true,
      userId: 0,
      frequency: "WEEKLY",
      location: "",
      notes: "",
    },
  });

  // Watch for changes in start time and duration to auto-calculate end time
  const startTime = form.watch("startTime");
  const durationMin = form.watch("durationMin");
  const useDuration = form.watch("useDuration");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-calculate end time when using duration mode
  useEffect(() => {
    if (useDuration && startTime && durationMin) {
      const calculatedEndTime = calculateEndTime(startTime, durationMin);
      const currentEndTime = form.getValues("endTime");
      // Only update if the calculated time is different to prevent infinite loops
      if (calculatedEndTime !== currentEndTime) {
        form.setValue("endTime", calculatedEndTime, { shouldValidate: false });
      }
    }
  }, [startTime, durationMin, useDuration, form]);

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (values: ScheduleFormValues) => {
      const response = await apiRequest("/api/recurring-schedules", "POST", values);
      return response;
    },
    onSuccess: () => {
      if (!isMountedRef.current) return;
      
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-schedules"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Recurring schedule created successfully.",
      });
    },
    onError: (error: Error) => {
      if (!isMountedRef.current) return;
      
      toast({
        title: "Error",
        description: error.message || "Failed to create schedule.",
        variant: "destructive",
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/recurring-schedules/${id}`, "DELETE");
    },
    onSuccess: () => {
      if (!isMountedRef.current) return;
      
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-schedules"] });
      setSelectedSchedule(null);
      toast({
        title: "Success",
        description: "Schedule deleted successfully.",
      });
    },
    onError: (error: Error) => {
      if (!isMountedRef.current) return;
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete schedule.",
        variant: "destructive",
      });
    },
  });

  // Delete individual session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return await apiRequest(`/api/sessions/${sessionId}`, "DELETE");
    },
    onSuccess: () => {
      if (!isMountedRef.current) return;
      
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Lesson cancelled",
        description: "The individual lesson has been cancelled successfully.",
      });
    },
    onError: (error: Error) => {
      if (!isMountedRef.current) return;
      
      toast({
        title: "Failed to cancel lesson",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Conflict detection - memoize to prevent re-renders
  const detectConflicts = useMemo(() => {
    return (newSchedule: Partial<ScheduleFormValues>) => {
      try {
        if (!newSchedule.dayOfWeek || !newSchedule.startTime || !newSchedule.endTime) {
          return [];
        }

        // Ensure dayOfWeek is a number for consistent comparison
        const newDayOfWeek = Number(newSchedule.dayOfWeek);

        // Safety check for schedules array
        if (!schedules || !Array.isArray(schedules)) {
          return [];
        }

        const newStart = parseISO(`2000-01-01T${newSchedule.startTime}:00`);
        const newEnd = parseISO(`2000-01-01T${newSchedule.endTime}:00`);
        
        // Check if dates are valid
        if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
          console.warn('Invalid time format in conflict detection');
          return [];
        }

        return schedules.filter(schedule => {
          if (!schedule || Number(schedule.dayOfWeek) !== newDayOfWeek) return false;
          
          try {
            const existingStart = parseISO(`2000-01-01T${schedule.startTime}:00`);
            const existingEnd = parseISO(`2000-01-01T${schedule.endTime}:00`);
            
            // Check if existing dates are valid
            if (isNaN(existingStart.getTime()) || isNaN(existingEnd.getTime())) {
              return false;
            }

            // Check for overlap
            return (newStart < existingEnd && newEnd > existingStart);
          } catch (error) {
            console.warn('Error parsing existing schedule times:', error);
            return false;
          }
        }).map(existing => ({
          existing,
          conflictType: 'overlap' as const
        }));
      } catch (error) {
        console.warn('Error in conflict detection:', error);
        return [];
      }
    };
  }, [schedules]);

  // Form submission
  const onSubmit = (values: ScheduleFormValues) => {
    const detectedConflicts = detectConflicts(values);
    
    if (detectedConflicts.length > 0) {
      setConflicts(detectedConflicts);
      toast({
        title: "Schedule conflict detected",
        description: `This schedule conflicts with ${detectedConflicts.length} existing schedule(s).`,
        variant: "destructive",
      });
      return;
    }

    createScheduleMutation.mutate(values);
  };

  // Week navigation
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'prev' ? -7 : 7));
  };

  // Get schedules for calendar view
  const getSchedulesForDay = (dayOffset: number) => {
    // Safety check for valid dayOffset
    if (dayOffset < 0 || dayOffset >= DAYS_OF_WEEK.length) {
      console.warn(`Invalid dayOffset: ${dayOffset}`);
      return [];
    }
    
    // Get the correct day value from DAYS_OF_WEEK array
    const targetDay = DAYS_OF_WEEK[dayOffset].value;
    
    // Safety check for schedules array
    if (!schedules || !Array.isArray(schedules)) {
      return [];
    }
    
    return schedules.filter(schedule => {
      // Safety check for schedule properties
      if (!schedule || typeof schedule.dayOfWeek !== 'number') {
        return false;
      }
      return schedule.dayOfWeek === targetDay;
    });
  };



  // Handle loading states
  const isLoading = schedulesLoading || studentsLoading || teachersLoading || sessionsLoading;
  
  if (isLoading) {
    return (
      <AppLayout title="Schedule Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p>Loading schedules...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Handle errors
  const hasError = schedulesError || studentsError || teachersError || sessionsError;
  
  if (hasError) {
    return (
      <AppLayout title="Schedule Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Schedule</h2>
            <p className="text-gray-600 mb-4">Unable to load schedule data. Please try again.</p>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Filter upcoming sessions for management
  const upcomingSessions = useMemo(() => {
    try {
      if (!sessions || !Array.isArray(sessions)) {
        return [];
      }
      
      const now = new Date();
      
      return sessions.filter((session: any) => {
        if (!session || !session.startTime) return false;
        
        try {
          const startTime = new Date(session.startTime);
          return !isNaN(startTime.getTime()) && startTime > now;
        } catch (error) {
          console.warn('Error parsing session startTime:', error);
          return false;
        }
      }).sort((a: any, b: any) => {
        try {
          const aTime = new Date(a.startTime).getTime();
          const bTime = new Date(b.startTime).getTime();
          
          if (isNaN(aTime) || isNaN(bTime)) return 0;
          return aTime - bTime;
        } catch (error) {
          console.warn('Error sorting sessions:', error);
          return 0;
        }
      });
    } catch (error) {
      console.warn('Error filtering upcoming sessions:', error);
      return [];
    }
  }, [sessions]);

  return (
    <AppLayout title="Schedule Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule Management</h1>
          <p className="text-gray-600">Manage recurring lesson schedules and individual sessions</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="recurring" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recurring">Recurring Schedules</TabsTrigger>
          <TabsTrigger value="sessions">Individual Lessons</TabsTrigger>
        </TabsList>

        <TabsContent value="recurring" className="space-y-6">
          {/* Week Navigation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CalendarDays className="h-5 w-5" />
                  <CardTitle>Weekly Schedule</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-3">
                    {format(currentWeek, "MMM d")} - {format(addDays(currentWeek, 6), "MMM d, yyyy")}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-4">
                {DAYS_OF_WEEK.map((day, index) => {
                  const daySchedules = getSchedulesForDay(index);
                  const currentDate = addDays(currentWeek, index);
                  
                  return (
                    <div key={day.value} className="min-h-[200px]">
                      <div className="text-center mb-3">
                        <h3 className="font-semibold text-gray-900">{day.label}</h3>
                        <p className="text-sm text-gray-500">
                          {format(currentDate, "MMM d")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {Array.isArray(daySchedules) && daySchedules.map((schedule) => {
                          if (!schedule || !schedule.id) return null;
                          
                          return (
                            <div
                              key={schedule.id}
                              className="p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                              onClick={() => setSelectedSchedule(schedule)}
                              data-testid={`schedule-${schedule.id}`}
                            >
                              <div className="text-sm font-medium text-blue-900 mb-1">
                                {getStudentName(schedule.studentId)}
                              </div>
                              <div className="flex items-center text-xs text-blue-700 mb-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {schedule.startTime || 'TBD'} - {schedule.endTime || 'TBD'}
                              </div>
                              {schedule.location && (
                                <div className="flex items-center text-xs text-blue-600">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {schedule.location}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {(!Array.isArray(daySchedules) || daySchedules.length === 0) && (
                          <div className="text-xs text-gray-400 text-center py-4">
                            No lessons
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Conflicts Display */}
          {Array.isArray(conflicts) && conflicts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center text-red-700">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Schedule Conflicts Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {conflicts.map((conflict, index) => {
                    if (!conflict || !conflict.existing) return null;
                    
                    return (
                      <div key={index} className="p-3 bg-white border border-red-200 rounded-lg">
                        <div className="font-medium text-red-900">
                          Conflict with {getStudentName(conflict.existing.studentId)}
                        </div>
                        <div className="text-sm text-red-700">
                          {DAYS_OF_WEEK.find(d => d.value === Number(conflict.existing.dayOfWeek))?.label || 'Unknown Day'} {conflict.existing.startTime || 'TBD'} - {conflict.existing.endTime || 'TBD'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          {/* Individual Sessions Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <List className="h-5 w-5" />
                <span>Upcoming Individual Lessons</span>
              </CardTitle>
              <CardDescription>
                Manage individual lessons from recurring schedules. Cancel specific lessons without affecting the recurring schedule.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="flex justify-center py-8">
                  <p>Loading sessions...</p>
                </div>
              ) : upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No upcoming lessons scheduled</p>
                  <p className="text-sm text-gray-400">Individual lessons are generated from recurring schedules</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Lesson Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingSessions.map((session: any) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="font-medium">{getStudentName(session.studentId)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{session.title}</div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(session.startTime), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(session.startTime), "h:mm a")} - {format(new Date(session.endTime), "h:mm a")}
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Individual Lesson</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel "{session.title}" for {getStudentName(session.studentId)} 
                                    on {format(new Date(session.startTime), "MMM d, yyyy 'at' h:mm a")}?
                                    <br /><br />
                                    This will only cancel this specific lesson and will not affect the recurring schedule.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Lesson</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteSessionMutation.mutate(session.id)}
                                    disabled={deleteSessionMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {deleteSessionMutation.isPending ? "Cancelling..." : "Cancel Lesson"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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

      {/* Schedule Details Dialog */}
      <Dialog open={!!selectedSchedule} onOpenChange={() => setSelectedSchedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Details</DialogTitle>
            <DialogDescription>
              Recurring lesson schedule information
            </DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{getStudentName(selectedSchedule.studentId)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <span>{DAYS_OF_WEEK.find(d => d.value === Number(selectedSchedule.dayOfWeek))?.label}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{selectedSchedule.startTime} - {selectedSchedule.endTime}</span>
              </div>
              
              {selectedSchedule.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{selectedSchedule.location}</span>
                </div>
              )}
              
              {selectedSchedule.notes && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">{selectedSchedule.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="destructive"
              onClick={() => selectedSchedule && deleteScheduleMutation.mutate(selectedSchedule.id)}
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? "Deleting..." : "Delete Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Recurring Schedule</DialogTitle>
            <DialogDescription>
              Create a new recurring lesson schedule
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {students?.map((student) => (
                          <SelectItem key={student.id} value={student.id.toString()}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teacher *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a teacher" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers?.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Start" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIME_SLOTS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="End" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIME_SLOTS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Room 1, Studio A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createScheduleMutation.isPending}
                  className="w-full"
                >
                  {createScheduleMutation.isPending ? "Creating..." : "Create Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
}