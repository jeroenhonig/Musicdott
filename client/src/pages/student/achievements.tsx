import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Target, Medal, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layouts/app-layout";

export default function AchievementsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: studentAchievements, isLoading } = useQuery({
    queryKey: ["/api/students", user?.id, "achievements"],
    enabled: !!user?.id,
  });

  const { data: allAchievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["/api/achievements"],
  });

  const markSeenMutation = useMutation({
    mutationFn: async (achievementId: number) => {
      return apiRequest("PATCH", `/api/students/achievements/${achievementId}/seen`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students", user?.id, "achievements"] });
    },
  });

  if (isLoading || achievementsLoading) {
    return (
      <AppLayout title="My Achievements">
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
      </AppLayout>
    );
  }

  const earnedAchievements = Array.isArray(studentAchievements) ? studentAchievements : [];
  const totalAchievements = Array.isArray(allAchievements) ? allAchievements : [];
  const completionRate = totalAchievements.length > 0 
    ? Math.round((earnedAchievements.length / totalAchievements.length) * 100) 
    : 0;

  const getAchievementIcon = (category: string) => {
    switch (category) {
      case 'practice': return <Target className="h-8 w-8" />;
      case 'skill': return <Star className="h-8 w-8" />;
      case 'milestone': return <Medal className="h-8 w-8" />;
      default: return <Trophy className="h-8 w-8" />;
    }
  };

  const getAchievementColor = (category: string) => {
    switch (category) {
      case 'practice': return 'text-blue-600 bg-blue-100';
      case 'skill': return 'text-purple-600 bg-purple-100';
      case 'milestone': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <AppLayout title="My Achievements">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Achievements</h1>
          <p className="text-gray-600 mt-2">Track your musical journey and celebrate your progress</p>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-yellow-600" />
              <span>Achievement Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-gray-500">
                    {earnedAchievements.length} / {totalAchievements.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-yellow-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="ml-6 text-center">
                <div className="text-3xl font-bold text-yellow-600">{completionRate}%</div>
                <div className="text-sm text-gray-500">Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earned Achievements */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Earned Achievements</h2>
          {earnedAchievements.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {earnedAchievements.map((studentAchievement: any) => {
                const achievement = totalAchievements.find((a: any) => a.id === studentAchievement.achievementId);
                if (!achievement) return null;

                return (
                  <Card key={studentAchievement.id} className="relative overflow-hidden">
                    {studentAchievement.isNew && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="default" className="bg-red-500">New!</Badge>
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${getAchievementColor(achievement.category)}`}>
                        {getAchievementIcon(achievement.category)}
                      </div>
                      <CardTitle className="text-center text-lg">{achievement.title}</CardTitle>
                      <CardDescription className="text-center">
                        {achievement.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-sm text-gray-500 mb-3">
                        Earned: {format(new Date(studentAchievement.dateEarned), "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-green-600 font-medium">Completed</span>
                      </div>
                      {studentAchievement.isNew && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={() => markSeenMutation.mutate(studentAchievement.id)}
                        >
                          Mark as Seen
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No achievements yet</h3>
                <p className="text-gray-600">Keep practicing to earn your first achievement!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Available Achievements */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Achievements</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {totalAchievements
              .filter((achievement: any) => 
                !earnedAchievements.some((earned: any) => earned.achievementId === achievement.id)
              )
              .map((achievement: any) => (
                <Card key={achievement.id} className="opacity-75 border-dashed">
                  <CardHeader className="pb-3">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${getAchievementColor(achievement.category)} opacity-50`}>
                      {getAchievementIcon(achievement.category)}
                    </div>
                    <CardTitle className="text-center text-lg text-gray-600">{achievement.title}</CardTitle>
                    <CardDescription className="text-center">
                      {achievement.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="flex items-center justify-center space-x-2 text-gray-500">
                      <Target className="h-4 w-4" />
                      <span className="text-sm">Not earned yet</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}