/**
 * Student Progress Display Component
 * Shows points, streaks, badges, and recent activity
 */

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Star, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface StudentProgress {
  userId: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  recentActivity: any[];
}

const BADGE_INFO = {
  'first_7_day_streak': { name: '7-Day Streak', icon: Flame, color: 'bg-orange-500' },
  'iron_focus': { name: 'Iron Focus', icon: Trophy, color: 'bg-gray-600' },
  'practice_warrior': { name: 'Practice Warrior', icon: Star, color: 'bg-purple-500' }
};

export function StudentProgressWidget() {
  const { data: progress, isLoading } = useQuery<StudentProgress>({
    queryKey: ['/api/gamification/me/summary'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) return null;

  const nextLevel = Math.ceil(progress.totalPoints / 100) * 100;
  const progressToNext = ((progress.totalPoints % 100) / 100) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Points & Level */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Total Points</span>
            <span className="text-lg font-bold text-blue-600">{progress.totalPoints}</span>
          </div>
          <Progress value={progressToNext} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {100 - (progress.totalPoints % 100)} points to next level
          </p>
        </div>

        {/* Current Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="font-medium">Current Streak</span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-orange-500">
              {progress.currentStreak}
            </div>
            <div className="text-xs text-gray-500">days</div>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Best Streak</span>
          <span className="font-semibold">{progress.longestStreak} days</span>
        </div>

        {/* Badges */}
        {progress.badges.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Badges Earned</h4>
            <div className="flex flex-wrap gap-2">
              {progress.badges.map((badgeKey) => {
                const badge = BADGE_INFO[badgeKey as keyof typeof BADGE_INFO];
                if (!badge) return null;
                
                const IconComponent = badge.icon;
                return (
                  <Badge key={badgeKey} variant="secondary" className="flex items-center gap-1">
                    <IconComponent className="h-3 w-3" />
                    {badge.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PracticeTimer({ onMinuteLogged }: { onMinuteLogged: () => void }) {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1;
          // Log a minute every 60 seconds
          if (newSeconds % 60 === 0) {
            onMinuteLogged();
          }
          return newSeconds;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isActive, onMinuteLogged]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setIsActive(true);
  const handleStop = () => {
    setIsActive(false);
    // Award final points for the session
    if (seconds >= 60) {
      onMinuteLogged();
    }
  };
  const handleReset = () => {
    setIsActive(false);
    setSeconds(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Practice Timer</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="text-4xl font-mono font-bold text-blue-600">
          {formatTime(seconds)}
        </div>
        
        <div className="flex gap-2 justify-center">
          {!isActive ? (
            <button
              onClick={handleStart}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Practice
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          )}
          
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        </div>
        
        {seconds >= 60 && (
          <p className="text-sm text-green-600">
            +{Math.floor(seconds / 60)} points earned
          </p>
        )}
      </CardContent>
    </Card>
  );
}