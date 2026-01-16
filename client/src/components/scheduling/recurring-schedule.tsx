import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Calendar, Edit, Trash2, Music, User } from "lucide-react";
import { format } from "date-fns";

interface RecurringSchedule {
  id: number;
  userId: number;
  studentId: number;
  studentName: string;
  instrument: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  recurrenceType: string;
  biWeeklyPattern: string | null;
  isActive: boolean;
  location: string | null;
  notes: string | null;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday", 
  "Tuesday",
  "Wednesday",
  "Thursday", 
  "Friday",
  "Saturday",
];

const RECURRENCE_TYPES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

interface RecurringScheduleListProps {
  teacherId?: number;
}

export function RecurringScheduleList({ teacherId }: RecurringScheduleListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    studentId: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    recurrenceType: "",
    biWeeklyPattern: "",
    location: "",
    notes: "",
  });
  
  // Fetch recurring schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["/api/recurring-schedules", teacherId],
    queryFn: async () => {
      const endpoint = teacherId 
        ? `/api/teachers/${teacherId}/recurring-schedules` 
        : "/api/recurring-schedules";
      const res = await apiRequest("GET", endpoint);
      return await res.json();
    },
  });

  // Fetch students for the select dropdown
  const { data: students = [] } = useQuery({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/students");
      return await res.json();
    },
  });
  
  const handleCreateSchedule = () => {
    // Implementation would go here - submit formData to API
    console.log("Form data:", formData);
    setIsCreateDialogOpen(false);
    setFormData({
      studentId: "",
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      recurrenceType: "",
      biWeeklyPattern: "",
      location: "",
      notes: "",
    });
    toast({
      title: "Schedule created",
      description: "The recurring schedule has been created successfully.",
    });
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Clear biWeeklyPattern when recurrence type changes away from biweekly
      if (field === 'recurrenceType' && value !== 'biweekly') {
        newData.biWeeklyPattern = '';
      }
      return newData;
    });
  };
  
  const handleDeleteSchedule = (id: number) => {
    // Implementation would go here
    toast({
      title: "Schedule deleted",
      description: "The recurring schedule has been deleted.",
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Recurring Schedule</h3>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create Recurring Schedule</DialogTitle>
              <DialogDescription>
                Set up a recurring lesson schedule for a student.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student" className="text-right">
                  Student
                </Label>
                <Select value={formData.studentId} onValueChange={(value) => handleFormChange('studentId', value)}>
                  <SelectTrigger id="student" className="col-span-3" data-testid="select-student">
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((student: any) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.name || `${student.firstName} ${student.lastName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="day" className="text-right">
                  Day
                </Label>
                <Select value={formData.dayOfWeek} onValueChange={(value) => handleFormChange('dayOfWeek', value)}>
                  <SelectTrigger id="day" className="col-span-3" data-testid="select-day">
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <SelectItem key={day} value={String(index)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Time</Label>
                <div className="col-span-3 flex gap-2 items-center">
                  <Input 
                    type="time" 
                    placeholder="Start time" 
                    className="w-32" 
                    value={formData.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                    data-testid="input-start-time"
                  />
                  <span className="text-muted-foreground mx-2">to</span>
                  <Input 
                    type="time" 
                    placeholder="End time" 
                    className="w-32" 
                    value={formData.endTime}
                    onChange={(e) => handleFormChange('endTime', e.target.value)}
                    data-testid="input-end-time"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recurrence" className="text-right">
                  Recurrence
                </Label>
                <Select value={formData.recurrenceType} onValueChange={(value) => handleFormChange('recurrenceType', value)}>
                  <SelectTrigger id="recurrence" className="col-span-3" data-testid="select-recurrence">
                    <SelectValue placeholder="Select recurrence type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Conditional bi-weekly pattern selector */}
              {formData.recurrenceType === 'biweekly' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="biweekly-pattern" className="text-right">
                    Weeks
                  </Label>
                  <Select value={formData.biWeeklyPattern} onValueChange={(value) => handleFormChange('biWeeklyPattern', value)}>
                    <SelectTrigger id="biweekly-pattern" className="col-span-3" data-testid="select-biweekly-pattern">
                      <SelectValue placeholder="Select which weeks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="even">Even weeks (2, 4, 6, 8...)</SelectItem>
                      <SelectItem value="odd">Odd weeks (1, 3, 5, 7...)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="Enter location (optional)"
                  className="col-span-3"
                  value={formData.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  data-testid="input-location"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this schedule (optional)"
                  className="col-span-3"
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  data-testid="textarea-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateSchedule}>
                Create Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {!schedules || schedules.length === 0 ? (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <CardDescription>
              No recurring schedule set up yet. <br />
              Click "Add Schedule" to create a recurring lesson schedule.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule: RecurringSchedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="font-medium">{schedule.studentName}</div>
                        <Badge variant="outline" className="ml-2">{schedule.instrument}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>{DAYS_OF_WEEK[schedule.dayOfWeek]}</TableCell>
                    <TableCell>
                      {schedule.startTime} - {schedule.endTime}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {schedule.recurrenceType.charAt(0).toUpperCase() + 
                         schedule.recurrenceType.slice(1)}
                        {schedule.biWeeklyPattern ? 
                          ` (${schedule.biWeeklyPattern === 'even' ? 'Even' : 'Odd'} weeks)` : 
                          ''
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={schedule.isActive ? "default" : "secondary"}>
                        {schedule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}