import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, Clock, Timer } from "lucide-react";

// Schedule form schema
const scheduleFormSchema = z.object({
  studentId: z.number(),
  dayOfWeek: z.string().min(1, "Day of week is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  durationMin: z.number().min(5, "Duration must be at least 5 minutes").optional(),
  useDuration: z.boolean().default(false),
  recurrenceType: z.string().min(1, "Recurrence type is required"),
  biWeeklyPattern: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

interface StudentScheduleFormProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  studentName: string;
}

export default function StudentScheduleForm({ 
  isOpen, 
  onClose, 
  studentId,
  studentName 
}: StudentScheduleFormProps) {
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      studentId,
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "09:30",
      durationMin: 30,
      useDuration: true,
      recurrenceType: "weekly",
      biWeeklyPattern: "even",
      location: "",
      notes: "",
    },
  });

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationMin: number) => {
    if (!startTime || !durationMin) return "";
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMin;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

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
      form.setValue("endTime", calculatedEndTime);
    }
  }, [startTime, durationMin, useDuration]);
  
  const createScheduleMutation = useMutation({
    mutationFn: async (values: ScheduleFormValues) => {
      const res = await apiRequest("/api/recurring-schedules", "POST", values);
      return await res.json();
    },
    onSuccess: () => {
      if (!isMountedRef.current) return;
      
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-schedules"] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/recurring-schedules`] });
      toast({
        title: "Schedule created",
        description: "The recurring schedule has been created successfully",
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      if (!isMountedRef.current) return;
      
      toast({
        title: "Failed to create schedule",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: ScheduleFormValues) {
    createScheduleMutation.mutate({
      ...values,
      studentId,
    });
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CalendarPlus className="h-5 w-5 mr-2 text-primary" />
            Schedule Lessons for {studentName}
          </DialogTitle>
          <DialogDescription>
            Create a recurring schedule for lessons with this student.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Duration vs Manual Time Selection Toggle */}
            <FormField
              control={form.control}
              name="useDuration"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center">
                      <Timer className="h-4 w-4 mr-2" />
                      Use Duration Selection
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      {field.value 
                        ? "Select start time + duration to auto-calculate end time"
                        : "Manually set start and end times"
                      }
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {useDuration ? (
              // Duration Mode UI
              <div className="space-y-4">
                {/* Start Time */}
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field} 
                          />
                        </FormControl>
                        <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Duration Selection */}
                <FormField
                  control={form.control}
                  name="durationMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesson Duration</FormLabel>
                      <div className="space-y-3">
                        {/* Quick Select Buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {[30, 45, 60].map((minutes) => (
                            <Button
                              key={minutes}
                              type="button"
                              variant={field.value === minutes ? "default" : "outline"}
                              size="sm"
                              onClick={() => field.onChange(minutes)}
                              data-testid={`duration-${minutes}`}
                            >
                              <Timer className="h-3 w-3 mr-1" />
                              {minutes} min
                            </Button>
                          ))}
                        </div>
                        {/* Custom Duration Input */}
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              type="number"
                              min="5"
                              max="480"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="w-20"
                              placeholder="30"
                              data-testid="custom-duration-input"
                            />
                          </FormControl>
                          <span className="text-sm text-muted-foreground">minutes</span>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Auto-calculated End Time Display */}
                {startTime && durationMin && (
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Calculated end time:</span>
                      <Badge variant="secondary" className="font-mono">
                        {calculateEndTime(startTime, durationMin)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Hidden End Time Field for Form Submission */}
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormControl>
                      <input type="hidden" {...field} />
                    </FormControl>
                  )}
                />
              </div>
            ) : (
              // Manual Start/End Time Mode UI
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field} 
                          />
                        </FormControl>
                        <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field} 
                          />
                        </FormControl>
                        <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recurrenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="once">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.watch("recurrenceType") === "biweekly" && (
                <FormField
                  control={form.control}
                  name="biWeeklyPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pattern</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pattern" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="even">Even Weeks</SelectItem>
                          <SelectItem value="odd">Odd Weeks</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Studio A, Online, etc." 
                      {...field} 
                    />
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
                    <Textarea 
                      placeholder="Any additional information about this schedule" 
                      {...field} 
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createScheduleMutation.isPending}
              >
                {createScheduleMutation.isPending ? "Creating..." : "Create Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}