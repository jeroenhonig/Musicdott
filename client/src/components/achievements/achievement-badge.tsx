import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Trophy, 
  Star, 
  Award, 
  Target, 
  Clock, 
  Music, 
  BookOpen, 
  Zap,
  Crown,
  Medal,
  Sparkles,
  CheckCircle,
  TrendingUp,
  Calendar,
  Users,
  Volume2
} from "lucide-react";

// Icon mapping for achievements
const ACHIEVEMENT_ICONS = {
  trophy: Trophy,
  star: Star,
  award: Award,
  target: Target,
  clock: Clock,
  music: Music,
  book: BookOpen,
  zap: Zap,
  crown: Crown,
  medal: Medal,
  sparkles: Sparkles,
  check: CheckCircle,
  trending: TrendingUp,
  calendar: Calendar,
  users: Users,
  volume: Volume2,
} as const;

// Badge color schemes
const BADGE_COLORS = {
  gold: "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900",
  silver: "bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900",
  bronze: "bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900",
  blue: "bg-gradient-to-br from-blue-400 to-blue-600 text-blue-900",
  green: "bg-gradient-to-br from-green-400 to-green-600 text-green-900",
  purple: "bg-gradient-to-br from-purple-400 to-purple-600 text-purple-900",
  red: "bg-gradient-to-br from-red-400 to-red-600 text-red-900",
  pink: "bg-gradient-to-br from-pink-400 to-pink-600 text-pink-900",
} as const;

interface AchievementBadgeProps {
  name: string;
  description: string;
  iconName: string;
  badgeColor: string;
  dateEarned?: Date | string;
  isNew?: boolean;
  xpValue?: number;
  size?: 'small' | 'medium' | 'large';
  showGlow?: boolean;
  locked?: boolean;
  progress?: number; // 0-100 for partial progress
}

export default function AchievementBadge({
  name,
  description,
  iconName,
  badgeColor,
  dateEarned,
  isNew = false,
  xpValue,
  size = 'medium',
  showGlow = false,
  locked = false,
  progress
}: AchievementBadgeProps) {
  const IconComponent = ACHIEVEMENT_ICONS[iconName as keyof typeof ACHIEVEMENT_ICONS] || Award;
  const colorClass = BADGE_COLORS[badgeColor as keyof typeof BADGE_COLORS] || BADGE_COLORS.blue;
  
  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24",
    large: "w-32 h-32"
  };
  
  const iconSizes = {
    small: "h-6 w-6",
    medium: "h-8 w-8", 
    large: "h-12 w-12"
  };

  return (
    <div className="relative group">
      <Card className={cn(
        "relative transition-all duration-300 hover:scale-105",
        locked ? "opacity-50 grayscale" : "",
        showGlow || isNew ? "shadow-lg ring-2 ring-yellow-400/50" : "",
        isNew ? "animate-pulse" : ""
      )}>
        <CardContent className="p-4 text-center">
          {/* Badge Circle */}
          <div className={cn(
            "mx-auto rounded-full flex items-center justify-center relative",
            sizeClasses[size],
            locked ? "bg-gray-200" : colorClass,
            showGlow ? "shadow-lg" : ""
          )}>
            {/* Progress Ring for partial achievements */}
            {progress !== undefined && progress < 100 && (
              <div className="absolute inset-0 rounded-full">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                    className="transition-all duration-500"
                  />
                </svg>
              </div>
            )}
            
            <IconComponent className={cn(
              iconSizes[size],
              locked ? "text-gray-400" : "text-white drop-shadow-sm"
            )} />
            
            {/* New badge indicator */}
            {isNew && !locked && (
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-4 w-4 text-yellow-400 animate-spin" />
              </div>
            )}
          </div>
          
          {/* Achievement Info */}
          <div className="mt-3 space-y-1">
            <h3 className={cn(
              "font-semibold text-sm",
              locked ? "text-gray-400" : "text-gray-900"
            )}>
              {name}
            </h3>
            
            <p className={cn(
              "text-xs leading-tight",
              locked ? "text-gray-400" : "text-gray-600"
            )}>
              {description}
            </p>
            
            {/* XP Value */}
            {xpValue && !locked && (
              <Badge variant="secondary" className="text-xs">
                +{xpValue} XP
              </Badge>
            )}
            
            {/* Progress percentage */}
            {progress !== undefined && progress < 100 && !locked && (
              <div className="text-xs text-gray-500">
                {Math.round(progress)}% complete
              </div>
            )}
            
            {/* Date earned */}
            {dateEarned && !locked && (
              <div className="text-xs text-gray-500">
                Earned {new Date(dateEarned).toLocaleDateString()}
              </div>
            )}
            
            {locked && (
              <div className="text-xs text-gray-400">
                Locked
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}