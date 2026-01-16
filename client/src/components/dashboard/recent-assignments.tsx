import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Assignment } from "@shared/schema";
import AvatarWithInitials from "@/components/ui/avatar-with-initials";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function RecentAssignments() {
  const { data: assignments, isLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/assignments"],
  });
  
  const sortedAssignments = assignments 
    ? [...assignments].sort((a, b) => 
        new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
      ).slice(0, 5)
    : [];
  
  const getTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };
  
  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200">
        <CardTitle className="text-lg font-medium text-gray-900">Recent Assignments</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <p>Loading recent assignments...</p>
          </div>
        ) : sortedAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-gray-500 mb-2">No assignments found</p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Create Assignment
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {sortedAssignments.map((assignment) => (
              <li key={assignment.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {assignment.songId ? "Song Assignment" : "Lesson Assignment"}
                    </div>
                    <div className="flex items-center">
                      <AvatarWithInitials 
                        name="Student Name" 
                        size="sm" 
                        bgColor={assignment.songId ? "bg-primary" : "bg-secondary"} 
                      />
                      <span className="ml-1.5 text-xs text-gray-500">Student Name</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{getTimeAgo(assignment.assignedDate)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="border-t border-gray-200 px-4 py-4 sm:px-6">
        <Link href="/students" className="text-sm font-medium text-primary hover:text-primary-700">
          View all assignments<span className="sr-only"> assignments</span>
        </Link>
      </CardFooter>
    </Card>
  );
}
