import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, MessageSquare, Calendar, BookOpen, Music, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import RequireRole, { RequireTeacher, RequireSchoolOwner } from "@/components/rbac/require-role";
import RoleIndicator from "@/components/rbac/role-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layouts/app-layout";

// Create a student form schema with teacher assignment and scheduling options
const studentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone: z.string().optional(),
  age: z.string().optional(),
  birthdate: z.string().optional(),
  instrument: z.string().min(1, "Instrument is required"),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  assignedTeacherId: z.string().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email("Valid parent email is required").optional().or(z.literal("")),
  parentPhone: z.string().optional(),
  notes: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Schema for recurring lesson scheduling
const recurringLessonSchema = z.object({
  dayOfWeek: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  startTime: z.string().min(1, "Start time is required"),
  duration: z.string().min(1, "Duration is required"),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const assignSongSchema = z.object({
  songId: z.string().min(1, "Please select a song"),
  notes: z.string().optional(),
});

const assignLessonSchema = z.object({
  lessonId: z.string().min(1, "Please select a lesson"),
  notes: z.string().optional(),
});

const scheduleSessionSchema = z.object({
  title: z.string().min(1, "Session title is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  notes: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;
type RecurringLessonValues = z.infer<typeof recurringLessonSchema>;
type AssignSongValues = z.infer<typeof assignSongSchema>;
type AssignLessonValues = z.infer<typeof assignLessonSchema>;
type ScheduleSessionValues = z.infer<typeof scheduleSessionSchema>;

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isAssignSongDialogOpen, setIsAssignSongDialogOpen] = useState(false);
  const [isAssignLessonDialogOpen, setIsAssignLessonDialogOpen] = useState(false);
  const [isScheduleSessionDialogOpen, setIsScheduleSessionDialogOpen] = useState(false);
  const [isRecurringLessonDialogOpen, setIsRecurringLessonDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const { toast } = useToast();
  
  const { 
    user, 
    currentSchool, 
    isPlatformOwner, 
    isSchoolOwner, 
    isTeacher, 
    isStudent 
  } = useAuth();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      age: "",
      birthdate: "",
      instrument: "",
      level: "beginner",
      assignedTeacherId: "",
      parentName: "",
      parentEmail: "",
      parentPhone: "",
      notes: "",
      username: "",
      password: "",
    },
  });

  const recurringLessonForm = useForm<RecurringLessonValues>({
    resolver: zodResolver(recurringLessonSchema),
    defaultValues: {
      dayOfWeek: "monday",
      startTime: "",
      duration: "60",
      location: "",
      notes: "",
    },
  });

  const updateForm = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      age: "",
      birthdate: "",
      instrument: "",
      level: "beginner",
      parentName: "",
      parentEmail: "",
      parentPhone: "",
      notes: "",
      username: "",
      password: "",
    },
  });

  const assignSongForm = useForm<AssignSongValues>({
    resolver: zodResolver(assignSongSchema),
    defaultValues: {
      songId: "",
      notes: "",
    },
  });

  const assignLessonForm = useForm<AssignLessonValues>({
    resolver: zodResolver(assignLessonSchema),
    defaultValues: {
      lessonId: "",
      notes: "",
    },
  });

  const scheduleSessionForm = useForm<ScheduleSessionValues>({
    resolver: zodResolver(scheduleSessionSchema),
    defaultValues: {
      title: "",
      startTime: "",
      endTime: "",
      notes: "",
    },
  });

  const { data: students = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/students"],
  });

  const { data: songs = [] } = useQuery<any[]>({
    queryKey: ["/api/songs"],
  });

  const { data: lessons = [] } = useQuery<any[]>({
    queryKey: ["/api/lessons"],
  });

  const { data: teachers = [] } = useQuery<any[]>({
    queryKey: ["/api/teachers"],
  });

  const createStudentMutation = useMutation({
    mutationFn: async (values: StudentFormValues) => {
      const response = await apiRequest("POST", "/api/students", values);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create student");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Student created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignSongMutation = useMutation({
    mutationFn: async (values: AssignSongValues) => {
      const response = await apiRequest("POST", "/api/assignments", {
        studentId: selectedStudent.id,
        songId: parseInt(values.songId),
        type: "song",
        notes: values.notes,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign song");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setIsAssignSongDialogOpen(false);
      assignSongForm.reset();
      toast({
        title: "Success",
        description: "Song assigned successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignLessonMutation = useMutation({
    mutationFn: async (values: AssignLessonValues) => {
      const response = await apiRequest("POST", "/api/assignments", {
        studentId: selectedStudent.id,
        lessonId: parseInt(values.lessonId),
        type: "lesson",
        notes: values.notes,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign lesson");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setIsAssignLessonDialogOpen(false);
      assignLessonForm.reset();
      toast({
        title: "Success",
        description: "Lesson assigned successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createRecurringLessonMutation = useMutation({
    mutationFn: async (values: RecurringLessonValues) => {
      // Convert day name to number (0=Sunday, 1=Monday, etc.)
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      // Calculate end time based on start time and duration
      const [hours, minutes] = values.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + parseInt(values.duration);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      const response = await apiRequest("POST", "/api/recurring-schedules", {
        studentId: selectedStudent.id,
        dayOfWeek: dayMap[values.dayOfWeek],
        startTime: values.startTime,
        endTime: endTime,
        recurrenceType: "weekly",
        location: values.location,
        notes: values.notes,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create recurring lesson");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-schedules"] });
      setIsRecurringLessonDialogOpen(false);
      recurringLessonForm.reset();
      toast({
        title: "Success",
        description: "Recurring lesson scheduled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scheduleSessionMutation = useMutation({
    mutationFn: async (values: ScheduleSessionValues) => {
      const response = await apiRequest("POST", "/api/sessions", {
        studentId: selectedStudent.id,
        title: values.title,
        startTime: new Date(values.startTime).toISOString(),
        endTime: new Date(values.endTime).toISOString(),
        notes: values.notes,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to schedule session");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setIsScheduleSessionDialogOpen(false);
      scheduleSessionForm.reset();
      toast({
        title: "Success",
        description: "Session scheduled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (values: StudentFormValues) => {
      // Convert assignedTeacherId to proper format
      const payload = {
        ...values,
        assignedTeacherId: values.assignedTeacherId === "unassigned" ? null : 
                          values.assignedTeacherId ? parseInt(values.assignedTeacherId) : null
      };
      
      const response = await apiRequest("PUT", `/api/students/${selectedStudent.id}`, payload);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update student");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setIsUpdateDialogOpen(false);
      updateForm.reset();
      toast({
        title: "Success",
        description: "Student updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const response = await apiRequest("DELETE", `/api/students/${studentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete student");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: StudentFormValues) {
    createStudentMutation.mutate(values);
  }

  function onUpdateSubmit(values: StudentFormValues) {
    updateStudentMutation.mutate(values);
  }

  function onAssignSongSubmit(values: AssignSongValues) {
    assignSongMutation.mutate(values);
  }

  function onAssignLessonSubmit(values: AssignLessonValues) {
    assignLessonMutation.mutate(values);
  }

  function onScheduleSessionSubmit(values: ScheduleSessionValues) {
    scheduleSessionMutation.mutate(values);
  }

  function onCreateRecurringLessonSubmit(values: RecurringLessonValues) {
    createRecurringLessonMutation.mutate(values);
  }

  const handleEditStudent = (student: any) => {
    setSelectedStudent(student);
    updateForm.reset({
      name: student.name,
      email: student.email || "",
      phone: student.phone || "",
      age: student.age?.toString() || "",
      instrument: student.instrument,
      level: student.level,
      parentName: student.parentName || "",
      parentEmail: student.parentEmail || "",
      parentPhone: student.parentPhone || "",
      notes: student.notes || "",
      username: student.username,
      password: "",
      assignedTeacherId: student.assignedTeacherId ? student.assignedTeacherId.toString() : "unassigned",
    });
    setIsUpdateDialogOpen(true);
  };

  const handleAssignSong = (student: any) => {
    setSelectedStudent(student);
    assignSongForm.reset();
    setIsAssignSongDialogOpen(true);
  };

  const handleAssignLesson = (student: any) => {
    setSelectedStudent(student);
    assignLessonForm.reset();
    setIsAssignLessonDialogOpen(true);
  };

  const handleScheduleSession = (student: any) => {
    setSelectedStudent(student);
    scheduleSessionForm.reset();
    setIsScheduleSessionDialogOpen(true);
  };

  const handleDeleteStudent = (student: any) => {
    setSelectedStudent(student);
  };

  const confirmDeleteStudent = () => {
    if (selectedStudent) {
      deleteStudentMutation.mutate(selectedStudent.id);
    }
  };

  const filteredStudents = Array.isArray(students) ? students.filter((student: any) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.level.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
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
  
  return (
    <AppLayout title="Students">
      <div className="space-y-6">
        {/* Header with role context */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <div className="flex items-center gap-2 mt-1">
              <RoleIndicator size="sm" />
              {currentSchool && (
                <span className="text-sm text-muted-foreground">
                  • {currentSchool.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search students..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-students"
            />
          </div>
          
          {/* Only teachers and above can add new students */}
          <RequireTeacher>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto" data-testid="button-add-student">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Student
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>
                  Create a new student profile with contact information and learning details.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter student's name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Enter age" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="birthdate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Birthdate (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" placeholder="Select birthdate" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="instrument"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instrument</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select instrument" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="drums">Drums</SelectItem>
                              <SelectItem value="piano">Piano</SelectItem>
                              <SelectItem value="guitar">Guitar</SelectItem>
                              <SelectItem value="bass">Bass</SelectItem>
                              <SelectItem value="violin">Violin</SelectItem>
                              <SelectItem value="vocals">Vocals</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="parentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent/Guardian Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter parent/guardian name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parentEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent/Guardian Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter parent/guardian email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="parentPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent/Guardian Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter parent/guardian phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username for student portal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes about the student" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createStudentMutation.isPending}>
                      {createStudentMutation.isPending ? "Creating..." : "Create Student"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </RequireTeacher>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student: any) => (
              <Card key={student.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{student.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{student.instrument}</Badge>
                        <Badge className={getLevelBadgeColor(student.level)}>
                          {student.level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    {student.age && <p>Age: {student.age}</p>}
                    {student.email && <p>Email: {student.email}</p>}
                    {student.phone && <p>Phone: {student.phone}</p>}
                    {student.parentName && <p>Parent: {student.parentName}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {/* Teacher+ actions - Edit, Assign, Schedule */}
                    <RequireTeacher>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditStudent(student)}
                        data-testid={`button-edit-${student.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignSong(student)}
                        data-testid={`button-assign-song-${student.id}`}
                      >
                        <Music className="h-3 w-3 mr-1" />
                        Assign Song
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignLesson(student)}
                        data-testid={`button-assign-lesson-${student.id}`}
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        Assign Lesson
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleScheduleSession(student)}
                        data-testid={`button-schedule-${student.id}`}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsRecurringLessonDialogOpen(true);
                        }}
                        data-testid={`button-recurring-${student.id}`}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Recurring
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={`/messages?student=${student.id}`} data-testid={`link-message-${student.id}`}>
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Message
                        </a>
                      </Button>
                    </RequireTeacher>

                    {/* School Owner+ actions - Delete student */}
                    <RequireSchoolOwner>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteStudent(student)}
                            data-testid={`button-delete-${student.id}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the student
                              "{selectedStudent?.name}" and remove all their data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={confirmDeleteStudent}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={deleteStudentMutation.isPending}
                            >
                              {deleteStudentMutation.isPending ? "Deleting..." : "Delete Student"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </RequireSchoolOwner>

                    {/* Read-only view for students - just show basic info */}
                    <RequireRole roles={['student']}>
                      <div className="text-sm text-muted-foreground px-2 py-1">
                        <Shield className="h-3 w-3 inline mr-1" />
                        View Only
                      </div>
                    </RequireRole>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Update Student Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update Student</DialogTitle>
              <DialogDescription>
                Edit student information and settings.
              </DialogDescription>
            </DialogHeader>
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter student's name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Enter age" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="birthdate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birthdate (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" placeholder="Select birthdate" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="instrument"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instrument</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select instrument" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="drums">Drums</SelectItem>
                            <SelectItem value="piano">Piano</SelectItem>
                            <SelectItem value="guitar">Guitar</SelectItem>
                            <SelectItem value="bass">Bass</SelectItem>
                            <SelectItem value="violin">Violin</SelectItem>
                            <SelectItem value="vocals">Vocals</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="assignedTeacherId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Teacher</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select teacher" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">No Teacher Assigned</SelectItem>
                            {(teachers || []).map((teacher: any) => (
                              <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                {teacher.name} - {teacher.instruments || 'All Instruments'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="parentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent/Guardian Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter parent/guardian name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="parentEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent/Guardian Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter parent/guardian email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={updateForm.control}
                  name="parentPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent/Guardian Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter parent/guardian phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username for student portal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password (leave blank to keep current)</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={updateForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about the student" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={updateStudentMutation.isPending}>
                    {updateStudentMutation.isPending ? "Updating..." : "Update Student"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Assign Song Dialog */}
        <Dialog open={isAssignSongDialogOpen} onOpenChange={setIsAssignSongDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Assign Song</DialogTitle>
              <DialogDescription>
                Assign a song to {selectedStudent?.name} for practice.
              </DialogDescription>
            </DialogHeader>
            <Form {...assignSongForm}>
              <form onSubmit={assignSongForm.handleSubmit(onAssignSongSubmit)} className="space-y-4">
                <FormField
                  control={assignSongForm.control}
                  name="songId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Song</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a song" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(songs || []).map((song: any) => (
                            <SelectItem key={song.id} value={song.id.toString()}>
                              {song.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignSongForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any specific instructions or notes about this assignment" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={assignSongMutation.isPending}>
                    {assignSongMutation.isPending ? "Assigning..." : "Assign Song"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Assign Lesson Dialog */}
        <Dialog open={isAssignLessonDialogOpen} onOpenChange={setIsAssignLessonDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Assign Lesson</DialogTitle>
              <DialogDescription>
                Assign a lesson to {selectedStudent?.name} for study.
              </DialogDescription>
            </DialogHeader>
            <Form {...assignLessonForm}>
              <form onSubmit={assignLessonForm.handleSubmit(onAssignLessonSubmit)} className="space-y-4">
                <FormField
                  control={assignLessonForm.control}
                  name="lessonId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesson</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a lesson" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(lessons || []).map((lesson: any) => (
                            <SelectItem key={lesson.id} value={lesson.id.toString()}>
                              {lesson.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignLessonForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any specific instructions or notes about this assignment" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={assignLessonMutation.isPending}>
                    {assignLessonMutation.isPending ? "Assigning..." : "Assign Lesson"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Schedule Session Dialog */}
        <Dialog open={isScheduleSessionDialogOpen} onOpenChange={setIsScheduleSessionDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Schedule Session</DialogTitle>
              <DialogDescription>
                Schedule a lesson session with {selectedStudent?.name}.
              </DialogDescription>
            </DialogHeader>
            <Form {...scheduleSessionForm}>
              <form onSubmit={scheduleSessionForm.handleSubmit(onScheduleSessionSubmit)} className="space-y-4">
                <FormField
                  control={scheduleSessionForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter session title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={scheduleSessionForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={scheduleSessionForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={scheduleSessionForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any notes about this session" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={scheduleSessionMutation.isPending}>
                    {scheduleSessionMutation.isPending ? "Scheduling..." : "Schedule Session"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Recurring Lesson Dialog */}
        <Dialog open={isRecurringLessonDialogOpen} onOpenChange={setIsRecurringLessonDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Schedule Recurring Lessons</DialogTitle>
              <DialogDescription>
                Set up weekly recurring lessons for {selectedStudent?.name}
              </DialogDescription>
            </DialogHeader>
            <Form {...recurringLessonForm}>
              <form onSubmit={recurringLessonForm.handleSubmit(onCreateRecurringLessonSubmit)} className="space-y-4">
                <FormField
                  control={recurringLessonForm.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Week</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="tuesday">Tuesday</SelectItem>
                          <SelectItem value="wednesday">Wednesday</SelectItem>
                          <SelectItem value="thursday">Thursday</SelectItem>
                          <SelectItem value="friday">Friday</SelectItem>
                          <SelectItem value="saturday">Saturday</SelectItem>
                          <SelectItem value="sunday">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={recurringLessonForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={recurringLessonForm.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                            <SelectItem value="90">90 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={recurringLessonForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Room 1, Studio A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={recurringLessonForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createRecurringLessonMutation.isPending}>
                    {createRecurringLessonMutation.isPending ? "Creating..." : "Create Recurring Lesson"}
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