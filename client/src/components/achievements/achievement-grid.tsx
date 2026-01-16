import React from 'react';
import { AchievementDefinition, StudentAchievement } from '@shared/schema';
import AchievementBadge from './achievement-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

interface AchievementGridProps {
  achievements: AchievementDefinition[];
  earnedAchievements?: StudentAchievement[];
  title?: string;
  description?: string;
  className?: string;
}

export default function AchievementGrid({
  achievements,
  earnedAchievements = [],
  title = "Achievements",
  description,
  className
}: AchievementGridProps) {
  // Function to determine if an achievement has been earned
  const isAchievementEarned = (achievementId: number) => {
    return !!earnedAchievements.find(a => a.achievementId === achievementId);
  };
  
  // Group achievements by their type for better organization
  const groupedAchievements = achievements.reduce((acc, achievement) => {
    const type = achievement.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(achievement);
    return acc;
  }, {} as Record<string, AchievementDefinition[]>);
  
  // Calculate statistics
  const totalAchievements = achievements.length;
  const earnedCount = earnedAchievements.length;
  const earnedPercentage = totalAchievements > 0 
    ? Math.round((earnedCount / totalAchievements) * 100) 
    : 0;
  
  return (
    <div className={className}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-2xl font-bold mb-2">{title}</h2>}
          {description && <p className="text-gray-500">{description}</p>}
        </div>
      )}
      
      {/* Statistics card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">{earnedCount}</div>
              <div className="text-sm text-gray-500">Achievements Earned</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{totalAchievements - earnedCount}</div>
              <div className="text-sm text-gray-500">Achievements Remaining</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{earnedPercentage}%</div>
              <div className="text-sm text-gray-500">Completion Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Achievements grouped by type */}
      {Object.entries(groupedAchievements).map(([type, typeAchievements]) => (
        <div key={type} className="mb-8">
          <h3 className="text-lg font-semibold mb-4 capitalize">{type} Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {typeAchievements.map(achievement => (
              <div 
                key={achievement.id} 
                className="flex flex-col items-center text-center"
              >
                <AchievementBadge 
                  achievement={achievement}
                  isEarned={isAchievementEarned(achievement.id)}
                  size="md"
                  className="mb-2"
                />
                <h4 className="text-sm font-semibold line-clamp-1">{achievement.name}</h4>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {achievements.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No achievements</h3>
            <p className="text-muted-foreground">
              Achievements will appear here as you progress.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}