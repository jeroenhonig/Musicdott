import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, MoreVertical } from "lucide-react";
import { Link } from "wouter";
import AvatarWithInitials from "@/components/ui/avatar-with-initials";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Session } from "@shared/schema";
import { format } from "date-fns";

export default function UpcomingLessons() {
  const [timeFilter, setTimeFilter] = useState("week");
  
  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });
  
  const filterSessions = (sessions: Session[] | undefined, filter: string) => {
    if (!sessions) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    
    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfWeek.getDate() + 7);
    
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    let filteredSessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      
      switch (filter) {
        case "today":
          return sessionDate >= today && sessionDate < tomorrow;
        case "week":
          return sessionDate >= today && sessionDate <= endOfWeek;
        case "nextWeek":
          return sessionDate > endOfWeek && sessionDate <= endOfNextWeek;
        case "month":
          return sessionDate >= today && sessionDate <= endOfMonth;
        default:
          return true;
      }
    });
    
    // Sort by date (soonest first)
    filteredSessions.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    return filteredSessions;
  };
  
  const filteredSessions = filterSessions(sessions, timeFilter);
  
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };
  
  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();
  };
  
  const getSessionDateLabel = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    if (isToday(date)) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          Today
        </span>
      );
    } else if (isTomorrow(date)) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          Tomorrow
        </span>
      );
    } else {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
          {format(date, 'MMM d')}
        </span>
      );
    }
  };
  
  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-gray-900">Upcoming Lessons</CardTitle>
        <div className="flex space-x-3">
          <Button
            size="icon"
            variant="default"
            className="h-7 w-7 rounded-full"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add lesson</span>
          </Button>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="text-sm h-8 border-gray-300 rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="nextWeek">Next Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <p>Loading upcoming lessons...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-gray-500 mb-2">No upcoming lessons found</p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Schedule a Lesson
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {filteredSessions.map((session) => (
              <li key={session.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AvatarWithInitials name="Student Name" size="md" bgColor="bg-primary" />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {session.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        Student Name - {session.notes}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {getSessionDateLabel(session.startTime)}
                    <span className="ml-2 text-sm text-gray-500">
                      {format(new Date(session.startTime), 'h:mm a')}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-2">
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                          <span className="sr-only">Options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Edit lesson</DropdownMenuItem>
                        <DropdownMenuItem>View student details</DropdownMenuItem>
                        <DropdownMenuItem>Add notes</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Cancel lesson</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="border-t border-gray-200 px-4 py-4 sm:px-6">
        <Link href="/schedule">
          <span className="text-sm font-medium text-primary hover:text-primary-700 cursor-pointer">
            View all lessons<span className="sr-only"> lessons</span>
          </span>
        </Link>
      </CardFooter>
    </Card>
  );
}
