import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Loader2, Plus, CalendarRange } from "lucide-react";
import TeacherTabs from "@/components/scheduling/teacher-tabs";

// Define types for our API responses
interface Teacher {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  instruments?: string | null;
}

interface Session {
  id: number;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  notes?: string | null;
  studentId: number;
  userId: number; // Teacher ID
}

interface RecurringSchedule {
  id: number;
  day: number;  // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  studentId: number;
  userId: number;
  notes?: string | null;
  // Adding missing properties based on code usage
  dayOfWeek?: number; // Alias for day to handle different API response formats
  recurrenceType?: string; // Type of recurrence (weekly, monthly, etc.)
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState<string>("sessions");

  // Fetch teachers for school (if user is school owner or admin)
  const { 
    data: teachers = [] as Teacher[], 
    isLoading: teachersLoading,
    isError: teachersError
  } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
    queryFn: getQueryFn<Teacher[]>(),
    enabled: !!user && (user.role === "school_owner" || user.role === "platform_owner"),
    retry: 1,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Fetch sessions
  const { 
    data: sessions = [] as Session[], 
    isLoading: sessionsLoading,
    isError: sessionsError 
  } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: getQueryFn<Session[]>(),
    enabled: !!user,
    retry: 1,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Fetch recurring schedules
  const { 
    data: recurringSchedules = [] as RecurringSchedule[], 
    isLoading: recurringLoading,
    isError: recurringError
  } = useQuery<RecurringSchedule[]>({
    queryKey: ["/api/recurring-schedules"],
    queryFn: getQueryFn<RecurringSchedule[]>(),
    enabled: !!user,
    retry: 1,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  return (
    <div className="container py-6 space-y-6 max-w-7xl">
      {/* Show loading state while user is being fetched */}
      {!user ? (
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('schedule.title')}</h1>
              <p className="text-muted-foreground">
                {t('schedule.subtitle')}
              </p>
            </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab("recurring")}>
            <CalendarRange className="h-4 w-4 mr-2" />
            {t('schedule.recurringSchedule')}
          </Button>
          <Button onClick={() => {}}>
            <Plus className="h-4 w-4 mr-2" />
            {t('schedule.newSession')}
          </Button>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sessions">Upcoming Sessions</TabsTrigger>
          <TabsTrigger value="recurring">Recurring Schedule</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sessions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle>
                  {selectedDate?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.role === "school_owner" || user.role === "platform_owner" ? (
                  <div className="space-y-4">
                    {teachersLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : teachersError ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground mb-2">There was an error loading teachers.</p>
                        <p className="text-sm text-muted-foreground">Please try refreshing the page.</p>
                      </div>
                    ) : teachers.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">School Teachers</h3>
                        {teachers.map(teacher => (
                          <Card key={teacher.id} className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{teacher.name}</h4>
                                <p className="text-sm text-muted-foreground">{teacher.email}</p>
                                {teacher.instruments && (
                                  <p className="text-sm text-muted-foreground">Teaches: {teacher.instruments}</p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground mb-2">No teachers found in your school.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessionsLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : sessionsError ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground mb-2">There was an error loading your sessions.</p>
                        <p className="text-sm text-muted-foreground">Please try refreshing the page.</p>
                      </div>
                    ) : sessions.length > 0 ? (
                      <div className="space-y-4">
                        {/* Filter sessions for the selected date */}
                        {sessions
                          .filter(session => {
                            if (!selectedDate) return false;
                            const sessionDate = new Date(session.startTime);
                            return (
                              sessionDate.getDate() === selectedDate.getDate() &&
                              sessionDate.getMonth() === selectedDate.getMonth() &&
                              sessionDate.getFullYear() === selectedDate.getFullYear()
                            );
                          })
                          .map(session => (
                            <Card key={session.id} className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">{session.title}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(session.startTime).toLocaleTimeString('en-US', { 
                                      hour: 'numeric', 
                                      minute: '2-digit',
                                      hour12: true
                                    })} - {new Date(session.endTime).toLocaleTimeString('en-US', { 
                                      hour: 'numeric', 
                                      minute: '2-digit',
                                      hour12: true 
                                    })}
                                  </p>
                                  {session.notes && (
                                    <p className="text-sm mt-2">{session.notes}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">Edit</Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No sessions scheduled for this date</p>
                        <Button className="mt-4" onClick={() => {}}>
                          <Plus className="h-4 w-4 mr-2" />
                          Schedule a Session
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="recurring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {recurringLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : recurringSchedules && recurringSchedules.length > 0 ? (
                <div className="space-y-4">
                  {recurringSchedules.map(schedule => (
                    <Card key={schedule.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {(() => {
                              // Use dayOfWeek if available, otherwise use day
                              const dayIndex = typeof schedule.dayOfWeek !== 'undefined' ? schedule.dayOfWeek : schedule.day;
                              const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                              return (dayIndex >= 0 && dayIndex < 7) ? days[dayIndex] : "Unknown";
                            })()} Session
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {schedule.startTime} - {schedule.endTime}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {(() => {
                              // Handle missing recurrenceType
                              if (!schedule.recurrenceType) return "Weekly";
                              return schedule.recurrenceType === "weekly" ? "Weekly" : 
                                   schedule.recurrenceType === "biweekly" ? "Bi-weekly" : "Monthly";
                            })()}
                          </p>
                          {schedule.notes && (
                            <p className="text-sm mt-2">{schedule.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No recurring schedules set up</p>
                  <Button className="mt-4" onClick={() => {}}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Recurring Schedule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
}