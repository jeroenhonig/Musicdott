import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Clock, PlayCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import Layout from "@/components/layouts/app-layout";

export default function MyAssignmentsPage() {
  const { user } = useAuth();
  
  const { data: assignments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/students", user?.id, "assignments"],
    enabled: !!user?.id,
  });

  const { data: songs = [], isLoading: songsLoading } = useQuery<any[]>({
    queryKey: ["/api/songs"],
  });

  if (isLoading || songsLoading) {
    return (
      <Layout title="My Assignments">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const songAssignments = assignments?.filter((a: any) => a.songId) || [];

  return (
    <Layout title="My Assignments">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-600 mt-2">Practice songs assigned by your teacher</p>
        </div>

        {songAssignments.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {songAssignments.map((assignment: any) => {
              const song = songs?.find((s: any) => s.id === assignment.songId);
              
              return (
                <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Music className="h-5 w-5 text-purple-600" />
                        <CardTitle className="text-lg">{song?.title || "Song"}</CardTitle>
                      </div>
                      <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                        {assignment.status || 'assigned'}
                      </Badge>
                    </div>
                    {assignment.dueDate && (
                      <CardDescription className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")}</span>
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {song?.description && (
                      <p className="text-sm text-gray-600 line-clamp-3">{song.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      {song?.key && <span>Key: {song.key}</span>}
                      {song?.duration && <span>Duration: {song.duration}</span>}
                    </div>
                    
                    {assignment.notes && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-sm text-purple-900 mb-1">Practice Notes:</h4>
                        <p className="text-sm text-purple-800">{assignment.notes}</p>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button className="flex-1" size="sm" variant="outline">
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Listen
                      </Button>
                      <Button className="flex-1" size="sm">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Practice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No song assignments yet</h3>
              <p className="text-gray-600">Your teacher will assign songs for you to practice.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}