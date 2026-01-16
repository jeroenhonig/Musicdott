import React, { useEffect } from 'react';
import { 
  useAchievementDefinitions, 
  useStudentAchievements, 
  useCheckAchievements 
} from '@/hooks/use-achievements';
import AchievementBadge from '@/components/achievements/achievement-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Award, Trophy, Target, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface AchievementsTabProps {
  studentId: number;
}

export default function AchievementsTab({ studentId }: AchievementsTabProps) {
  const { toast } = useToast();
  
  const { 
    data: achievementDefinitions = [], 
    isLoading: isLoadingDefinitions 
  } = useAchievementDefinitions();
  
  const { 
    data: studentAchievements = [], 
    isLoading: isLoadingAchievements,
    refetch: refetchAchievements
  } = useStudentAchievements(studentId);
  
  const checkAchievements = useCheckAchievements(studentId);
  
  // Group achievements by category
  const achievementsByCategory = React.useMemo(() => {
    const categories: Record<string, any[]> = {};
    
    achievementDefinitions.forEach(def => {
      const category = def.type;
      if (!categories[category]) categories[category] = [];
      
      const studentAchievement = studentAchievements.find(sa => sa.achievementId === def.id);
      
      categories[category].push({
        definition: def,
        studentAchievement,
        isEarned: !!studentAchievement,
        progress: studentAchievement?.progress || 0
      });
    });
    
    return categories;
  }, [achievementDefinitions, studentAchievements]);
  
  // Calculate total XP and achievement stats
  const stats = React.useMemo(() => {
    const totalXP = studentAchievements.reduce((sum, achievement) => {
      const def = achievementDefinitions.find(d => d.id === achievement.achievementId);
      return sum + (def?.xpValue || 0);
    }, 0);
    
    const earnedCount = studentAchievements.length;
    const totalCount = achievementDefinitions.length;
    const completionRate = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;
    
    return { totalXP, earnedCount, totalCount, completionRate };
  }, [studentAchievements, achievementDefinitions]);
  
  const handleCheckAchievements = async () => {
    try {
      const newAchievements = await checkAchievements.mutateAsync();
      
      if (newAchievements.length > 0) {
        toast({
          title: "New achievements unlocked!",
          description: `Congratulations! You've earned ${newAchievements.length} new achievement${newAchievements.length > 1 ? 's' : ''}!`,
          variant: "default",
        });
        refetchAchievements();
      } else {
        toast({
          title: "Keep going!",
          description: "No new achievements yet. Continue practicing to unlock more rewards!",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error checking achievements",
        description: "Failed to check for new achievements.",
        variant: "destructive",
      });
    }
  };
  
  const isLoading = isLoadingDefinitions || isLoadingAchievements;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (achievementDefinitions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <Award className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No achievements available</h3>
          <p className="text-muted-foreground mb-4">
            Achievements have not been set up yet.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const categoryLabels: Record<string, string> = {
    lesson_completion: "Lesson Mastery",
    practice_streak: "Practice Dedication", 
    skill_progress: "Skill Development",
    assignment_completion: "Assignment Excellence",
    session_attendance: "Attendance Awards"
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-800">{stats.totalXP}</p>
            <p className="text-sm text-yellow-600">Total XP</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-800">{stats.earnedCount}</p>
            <p className="text-sm text-green-600">Earned</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-800">{stats.totalCount}</p>
            <p className="text-sm text-blue-600">Available</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-800">{stats.completionRate}%</p>
            <p className="text-sm text-purple-600">Complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Check Achievements Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleCheckAchievements} 
          disabled={checkAchievements.isPending}
          className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-medium px-8"
        >
          {checkAchievements.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          <Sparkles className="mr-2 h-4 w-4" />
          Check for New Achievements
        </Button>
      </div>
      
      {/* Achievement Categories */}
      {Object.entries(achievementsByCategory).map(([category, achievements]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {categoryLabels[category] || category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            <Badge variant="secondary" className="ml-2">
              {achievements.filter(a => a.isEarned).length} / {achievements.length}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {achievements.map((achievement) => (
              <AchievementBadge
                key={achievement.definition.id}
                name={achievement.definition.name}
                description={achievement.definition.description}
                iconName={achievement.definition.iconName}
                badgeColor={achievement.definition.badgeColor}
                dateEarned={achievement.studentAchievement?.dateEarned}
                isNew={achievement.studentAchievement?.isNew}
                xpValue={achievement.definition.xpValue}
                locked={!achievement.isEarned}
                progress={achievement.progress}
                size="medium"
              />
            ))}
          </div>
        </div>
      ))}
      
      {/* Empty State */}
      {Object.keys(achievementsByCategory).length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Award className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Start Your Achievement Journey!</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Complete lessons, practice regularly, and reach milestones to unlock achievement badges and earn XP.
            </p>
            <Button 
              onClick={handleCheckAchievements}
              className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Check for Achievements
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}