import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Teacher {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  instruments?: string | null;
}

interface Student {
  id: number;
  name: string;
  assignedTeacherId?: number | null;
}

interface AssignTeacherDialogProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignTeacherDialog({ 
  student,
  open,
  onOpenChange
}: AssignTeacherDialogProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    student.assignedTeacherId ? student.assignedTeacherId.toString() : ""
  );
  const { toast } = useToast();

  // Fetch teachers
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['/api/teachers'],
    queryFn: getQueryFn(),
    enabled: open, // Only fetch when dialog is open
  });

  // Mutation to assign teacher
  const assignTeacherMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        'PUT', 
        `/api/students/${student.id}`, 
        { assignedTeacherId: selectedTeacherId ? parseInt(selectedTeacherId) : null }
      );
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${student.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      
      toast({
        title: "Teacher assigned",
        description: selectedTeacherId 
          ? `${student.name} has been assigned to a new teacher.` 
          : `${student.name} has been unassigned from their teacher.`,
      });
      
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign teacher",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Set background color based on teacher id
  const getAvatarColor = (id: number) => {
    const colors = [
      "bg-red-500",
      "bg-green-500",
      "bg-blue-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-gray-500"
    ];
    
    return colors[id % colors.length];
  };

  const handleAssign = () => {
    assignTeacherMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Teacher</DialogTitle>
          <DialogDescription>
            Select a teacher to assign to {student.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teacher" className="text-right">
              Teacher
            </Label>
            <div className="col-span-3">
              {teachersLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading teachers...</span>
                </div>
              ) : (
                <Select
                  value={selectedTeacherId}
                  onValueChange={setSelectedTeacherId}
                >
                  <SelectTrigger id="teacher">
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Unassign)</SelectItem>
                    {teachers && teachers.map((teacher: Teacher) => (
                      <SelectItem 
                        key={teacher.id} 
                        value={teacher.id.toString()}
                        className="flex items-center"
                      >
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2 inline-block">
                            <AvatarImage src={teacher.avatar || ""} />
                            <AvatarFallback className={getAvatarColor(teacher.id)}>
                              {getInitials(teacher.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{teacher.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          {selectedTeacherId && teachers && (
            <div className="bg-muted p-3 rounded-md mt-2">
              <h4 className="text-sm font-medium mb-1">Teacher Information</h4>
              {teachers.map((teacher: Teacher) => {
                if (teacher.id.toString() === selectedTeacherId) {
                  return (
                    <div key={teacher.id} className="text-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={teacher.avatar || ""} />
                          <AvatarFallback className={getAvatarColor(teacher.id)}>
                            {getInitials(teacher.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{teacher.name}</p>
                          <p className="text-xs text-muted-foreground">{teacher.email}</p>
                        </div>
                      </div>
                      {teacher.instruments && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Instruments: {teacher.instruments}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={assignTeacherMutation.isPending}
          >
            {assignTeacherMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Assign Teacher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}