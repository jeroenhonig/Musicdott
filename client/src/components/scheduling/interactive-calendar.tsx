import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-styles.css";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CalendarIcon, 
  Download, 
  Upload,
  Users,
  Clock,
  MapPin,
  AlertTriangle,
  Copy,
  Trash2,
  Plus,
  Filter
} from "lucide-react";
import { RecurringSchedule, Student, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, addDays, addWeeks, addMonths, parseISO, startOfDay, endOfDay } from "date-fns";

const localizer = momentLocalizer(moment);

// Define custom event interface
interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    scheduleId: number;
    studentId: number;
    studentName: string;
    teacherId?: number;
    teacherName?: string;
    location?: string;
    notes?: string;
    isRecurring: boolean;
    recurrenceType?: string;
    instrument?: string;
    level?: string;
    conflicted?: boolean;
  };
}

// Component props
interface InteractiveCalendarProps {
  teacherId?: number;
  studentId?: number;
  defaultView?: View;
  onEventSelect?: (event: CalendarEvent) => void;
  onSlotSelect?: (slotInfo: { start: Date; end: Date }) => void;
}

export default function InteractiveCalendar({
  teacherId,
  studentId,
  defaultView = Views.WEEK,
  onEventSelect,
  onSlotSelect
}: InteractiveCalendarProps) {
  const { toast } = useToast();
  
  // State management
  const [view, setView] = useState<View>(defaultView);
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictingEvents, setConflictingEvents] = useState<CalendarEvent[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");

  // Fetch data
  // Build query string for filters
  const queryParams = new URLSearchParams();
  if (teacherId) queryParams.set('teacherId', teacherId.toString());
  if (studentId) queryParams.set('studentId', studentId.toString());
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/recurring-schedules?${queryString}` : "/api/recurring-schedules";

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<RecurringSchedule[]>({
    queryKey: [endpoint, teacherId, studentId],
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: teachers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/teachers"],
  });

  // Transform schedules to calendar events
  const calendarEvents = useMemo(() => {
    if (!schedules.length) return [];
    
    const events: CalendarEvent[] = [];
    const now = new Date();
    const endRange = new Date();
    endRange.setMonth(endRange.getMonth() + 6); // 6 months ahead
    
    for (const schedule of schedules) {
      const student = students.find(s => s.id === schedule.studentId);
      const teacher = teachers.find(t => t.id === schedule.userId); // userId is the teacher who created it
      
      if (!student) continue;
      
      // Filter by selected teacher/student
      if (selectedTeacher !== "all" && teacher?.id.toString() !== selectedTeacher) continue;
      if (selectedStudent !== "all" && student.id.toString() !== selectedStudent) continue;
      
      // Generate occurrences based on recurrence type
      const occurrences = generateOccurrences(schedule, now, endRange);
      
      for (const occurrence of occurrences) {
        events.push({
          id: parseInt(`${schedule.id}${occurrence.start.getTime()}`),
          title: `${student.instrument || 'Lesson'} - ${student.name}`,
          start: occurrence.start,
          end: occurrence.end,
          resource: {
            scheduleId: schedule.id,
            studentId: schedule.studentId,
            studentName: student.name,
            teacherId: schedule.userId,
            teacherName: teacher?.name,
            location: schedule.location || undefined,
            notes: schedule.notes || undefined,
            isRecurring: schedule.frequency !== 'ONCE',
            recurrenceType: schedule.frequency,
            instrument: student.instrument,
            level: student.level || undefined,
          },
        });
      }
    }
    
    // Detect conflicts
    return detectEventConflicts(events);
  }, [schedules, students, teachers, selectedTeacher, selectedStudent]);

  // Event handlers
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
    onEventSelect?.(event);
  }, [onEventSelect]);

  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    onSlotSelect?.(slotInfo);
  }, [onSlotSelect]);

  const handleEventDrop = useMutation({
    mutationFn: async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
      const updatedSchedule = {
        dayOfWeek: String(start.getDay()),
        startTime: format(start, 'HH:mm'),
        endTime: format(end, 'HH:mm'),
      };
      
      return await apiRequest(`/api/recurring-schedules/${event.resource.scheduleId}`, "PUT", updatedSchedule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-schedules"] });
      toast({
        title: "Schedule updated",
        description: "The lesson has been moved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to move lesson",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEventResize = useMutation({
    mutationFn: async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
      const updatedSchedule = {
        startTime: format(start, 'HH:mm'),
        endTime: format(end, 'HH:mm'),
      };
      
      return await apiRequest(`/api/recurring-schedules/${event.resource.scheduleId}`, "PUT", updatedSchedule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-schedules"] });
      toast({
        title: "Schedule updated",
        description: "The lesson duration has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resize lesson",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Event styling
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const baseStyle = {
      backgroundColor: event.resource.conflicted ? '#dc2626' : '#3b82f6',
      borderRadius: '6px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
    };

    // Color by instrument
    const instrumentColors: { [key: string]: string } = {
      piano: '#8b5cf6',
      guitar: '#f59e0b',
      drums: '#ef4444',
      violin: '#10b981',
      voice: '#ec4899',
    };

    const instrument = event.resource.instrument?.toLowerCase();
    if (instrument && instrumentColors[instrument]) {
      baseStyle.backgroundColor = instrumentColors[instrument];
    }

    return { style: baseStyle };
  }, []);

  // Custom toolbar
  const CustomToolbar = ({ label, onView, onNavigate, views }: {
    label: string;
    onView: (view: string) => void;
    onNavigate: (action: string) => void;
    views: string[];
  }) => (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigate('PREV')}
        >
          Previous
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigate('TODAY')}
        >
          Today
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigate('NEXT')}
        >
          Next
        </Button>
      </div>
      
      <h2 className="text-lg font-semibold">{label}</h2>
      
      <div className="flex items-center space-x-2">
        {views.map((viewName: string) => (
          <Button
            key={viewName}
            variant={view === viewName ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setView(viewName as View);
              onView(viewName);
            }}
          >
            {viewName === 'month' ? 'Month' : 
             viewName === 'week' ? 'Week' : 
             viewName === 'work_week' ? 'Work Week' :
             viewName === 'day' ? 'Day' : 'Agenda'}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Interactive Schedule</span>
              {conflictingEvents.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {conflictingEvents.length} conflicts
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                <Upload className="h-4 w-4 mr-1" />
                Import iCal
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Download className="h-4 w-4 mr-1" />
                Export iCal
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Teachers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teachers</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id.toString()}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <span>Total lessons: {calendarEvents.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onEventDrop={({ event, start, end }: { event: any; start: Date; end: Date }) => {
                if (event && start && end) {
                  const conflicts = detectTimeConflict(event as CalendarEvent, start, end, calendarEvents);
                  if (conflicts.length > 0) {
                    setConflictingEvents(conflicts);
                    setShowConflictDialog(true);
                    return;
                  }
                  handleEventDrop.mutate({ event: event as CalendarEvent, start, end });
                }
              }}
              onEventResize={({ event, start, end }: { event: any; start: Date; end: Date }) => {
                if (event && start && end) {
                  handleEventResize.mutate({ event: event as CalendarEvent, start, end });
                }
              }}
              eventPropGetter={eventStyleGetter}
              components={{
                toolbar: CustomToolbar,
              }}
              selectable
              resizable
              popup
              views={[Views.MONTH, Views.WEEK, Views.WORK_WEEK, Views.DAY, Views.AGENDA]}
              step={15}
              timeslots={4}
              min={new Date(2000, 0, 1, 8, 0)}
              max={new Date(2000, 0, 1, 22, 0)}
              formats={{
                eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }, culture: string, localizer: any) =>
                  `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
                agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }, culture: string, localizer: any) =>
                  `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Lesson Details
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && format(selectedEvent.start, 'PPPP')} at {selectedEvent && format(selectedEvent.start, 'HH:mm')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{selectedEvent.resource.studentName}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}</span>
                </div>
                {selectedEvent.resource.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{selectedEvent.resource.location}</span>
                  </div>
                )}
                {selectedEvent.resource.teacherName && (
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{selectedEvent.resource.teacherName}</span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-1">
                <Badge variant="outline">{selectedEvent.resource.instrument}</Badge>
                <Badge variant="outline">{selectedEvent.resource.level}</Badge>
                {selectedEvent.resource.isRecurring && (
                  <Badge variant="secondary">{selectedEvent.resource.recurrenceType}</Badge>
                )}
              </div>
              
              {selectedEvent.resource.notes && (
                <div className="p-3 bg-muted rounded-md text-sm">
                  {selectedEvent.resource.notes}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="space-x-2">
            <Button variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-1" />
              Duplicate
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button size="sm">
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              Schedule Conflict Detected
            </DialogTitle>
            <DialogDescription>
              The lesson you're trying to move conflicts with existing schedules.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {conflictingEvents.map((event, idx) => (
              <div key={idx} className="p-3 border rounded-md">
                <div className="font-medium">{event.title}</div>
                <div className="text-sm text-muted-foreground">
                  {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConflictDialog(false)}>
              Cancel
            </Button>
            <Button>
              Move Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper functions

function generateOccurrences(
  schedule: RecurringSchedule, 
  startDate: Date, 
  endDate: Date
): Array<{ start: Date; end: Date }> {
  const occurrences: Array<{ start: Date; end: Date }> = [];
  // Convert dayOfWeek string to number (0=Sunday, 1=Monday, etc.)
  const dayOfWeekNumber = parseInt(schedule.dayOfWeek);
  const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
  const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
  
  let currentDate = new Date(startDate);
  
  // Find first occurrence
  while (currentDate.getDay() !== dayOfWeekNumber && currentDate < endDate) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  while (currentDate <= endDate) {
    const start = new Date(currentDate);
    start.setHours(startHour, startMinute, 0, 0);
    
    const end = new Date(currentDate);
    end.setHours(endHour, endMinute, 0, 0);
    
    occurrences.push({ start, end });
    
    // Move to next occurrence based on frequency
    switch (schedule.frequency?.toUpperCase()) {
      case 'WEEKLY':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'BIWEEKLY':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'MONTHLY':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default: // 'ONCE'
        currentDate = new Date(endDate.getTime() + 1); // Exit loop
        break;
    }
  }
  
  return occurrences;
}

function detectEventConflicts(events: CalendarEvent[]): CalendarEvent[] {
  const eventsWithConflicts = events.map(event => ({ ...event }));
  
  for (let i = 0; i < eventsWithConflicts.length; i++) {
    for (let j = i + 1; j < eventsWithConflicts.length; j++) {
      const event1 = eventsWithConflicts[i];
      const event2 = eventsWithConflicts[j];
      
      // Check if events overlap
      if (event1.start < event2.end && event1.end > event2.start) {
        event1.resource.conflicted = true;
        event2.resource.conflicted = true;
      }
    }
  }
  
  return eventsWithConflicts;
}

function detectTimeConflict(
  event: CalendarEvent, 
  newStart: Date, 
  newEnd: Date, 
  allEvents: CalendarEvent[]
): CalendarEvent[] {
  const conflicts: CalendarEvent[] = [];
  
  for (const existingEvent of allEvents) {
    if (existingEvent.id === event.id) continue;
    
    // Check if the new time slot conflicts with existing event
    if (newStart < existingEvent.end && newEnd > existingEvent.start) {
      conflicts.push(existingEvent);
    }
  }
  
  return conflicts;
}