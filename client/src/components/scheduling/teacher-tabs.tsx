import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarPlus, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RecurringSchedule, Student } from "@shared/schema";
import StudentScheduleForm from "./student-schedule-form";

interface Teacher {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  instruments?: string | null;
}

interface ScheduleSession {
  id: number;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  notes?: string | null;
  studentId: number;
  userId: number;
}

interface TeacherTabsProps {
  teachers: Teacher[];
  isLoading: boolean;
  sessions: Session[];
  sessionsLoading: boolean;
  selectedDate?: Date;
}

export default function TeacherTabs({ teachers, isLoading, sessions, sessionsLoading, selectedDate }: TeacherTabsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-muted-foreground">Loading teachers...</div>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarPlus className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Teachers Found</h3>
        <p className="text-muted-foreground mb-4">There are no teachers in your school yet.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue={teachers[0]?.id.toString()} className="w-full">
      <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {teachers.slice(0, 3).map((teacher) => (
          <TabsTrigger key={teacher.id} value={teacher.id.toString()}>
            {teacher.name}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {teachers.map((teacher) => (
        <TabsContent key={teacher.id} value={teacher.id.toString()}>
          <TeacherScheduleView 
            teacher={teacher} 
            sessions={sessions.filter(s => s.userId === teacher.id)}
            sessionsLoading={sessionsLoading}
            selectedDate={selectedDate}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TeacherScheduleView({ 
  teacher, 
  sessions, 
  sessionsLoading, 
  selectedDate 
}: { 
  teacher: Teacher; 
  sessions: Session[]; 
  sessionsLoading: boolean; 
  selectedDate?: Date; 
}) {
  
  // Convert day number to day name
  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };
  
  // Format time from 24h format ("14:30") to 12h format with AM/PM
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  // Get recurrence pattern text
  const getRecurrenceText = (schedule: RecurringSchedule) => {
    switch(schedule.recurrenceType) {
      case "weekly":
        return "Weekly";
      case "biweekly":
        return `Bi-weekly (${schedule.biWeeklyPattern === "even" ? "Even" : "Odd"} weeks)`;
      case "monthly":
        return "Monthly";
      case "once":
        return "One-time";
      default:
        return schedule.recurrenceType;
    }
  };
  
  return (
    <Tabs defaultValue="schedules" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="schedules">Regular Schedules</TabsTrigger>
        <TabsTrigger value="sessions">Upcoming Sessions</TabsTrigger>
      </TabsList>
      
      <TabsContent value="schedules">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recurring Lesson Schedule</h3>
          <Button 
            onClick={() => setIsScheduleFormOpen(true)} 
            className="flex items-center"
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Add Schedule
          </Button>
        </div>
        
        {isLoadingSchedules ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !recurringSchedules?.length ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-2 text-md font-medium">No recurring schedules</p>
              <p className="text-sm text-muted-foreground">
                Create a regular schedule for lessons with this student.
              </p>
              <Button 
                onClick={() => setIsScheduleFormOpen(true)} 
                variant="outline" 
                className="mt-4"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Schedule Lessons
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recurringSchedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-primary" />
                      {getDayName(Number(schedule.dayOfWeek))} Lessons
                    </CardTitle>
                    <Badge variant={schedule.isActive ? "default" : "secondary"}>
                      {schedule.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pattern:</span>
                      <span>{getRecurrenceText(schedule)}</span>
                    </div>
                    {schedule.location && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{schedule.location}</span>
                      </div>
                    )}
                    {schedule.notes && (
                      <div className="text-sm mt-2">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1">{schedule.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="destructive" size="sm">Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="sessions">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upcoming Lessons</h3>
          <Button variant="outline" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Generate from Schedule
          </Button>
        </div>
        
        {isLoadingSessions ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !sessions?.length ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-2 text-md font-medium">No upcoming sessions</p>
              <p className="text-sm text-muted-foreground">
                Sessions will be automatically generated from the recurring schedule.
              </p>
              <Button 
                onClick={() => setIsScheduleFormOpen(true)} 
                variant="outline" 
                className="mt-4"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Schedule Lessons
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} className={`${session.isRescheduled ? 'border-amber-300' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{session.title}</CardTitle>
                    {session.isRescheduled && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Rescheduled
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    {format(new Date(session.startTime), "EEEE, MMMM d, yyyy")} at {format(new Date(session.startTime), "h:mm a")} - {format(new Date(session.endTime), "h:mm a")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {session.notes && (
                    <p className="text-sm text-muted-foreground mb-2">{session.notes}</p>
                  )}
                  <div className="flex justify-end gap-2 mt-1">
                    <Button variant="outline" size="sm">Reschedule</Button>
                    <Button variant="destructive" size="sm">Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
      
      {/* Schedule Form Dialog */}
      <StudentScheduleForm 
        isOpen={isScheduleFormOpen}
        onClose={() => setIsScheduleFormOpen(false)}
        studentId={studentId}
        studentName={student.name}
      />
    </Tabs>
  );
}