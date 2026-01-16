import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Trophy, Sparkles, Star } from "lucide-react";
import { AchievementDefinition, StudentAchievement } from "@shared/schema";
import AchievementBadge from "./achievement-badge";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

interface AchievementNotificationProps {
  achievement: AchievementDefinition;
  studentAchievement: StudentAchievement;
  onClose: () => void;
}

export default function AchievementNotification({
  achievement,
  studentAchievement,
  onClose
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-4 right-4 z-50 max-w-sm"
        >
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 shadow-xl">
            <CardContent className="p-6">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Header with sparkles */}
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                <h3 className="font-bold text-lg text-yellow-800">
                  Achievement Unlocked!
                </h3>
                <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
              </div>

              {/* Achievement badge */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <AchievementBadge
                    name={achievement.name}
                    description={achievement.description}
                    iconName={achievement.iconName}
                    badgeColor={achievement.badgeColor}
                    dateEarned={studentAchievement.dateEarned}
                    isNew={true}
                    xpValue={achievement.xpValue}
                    size="large"
                    showGlow={true}
                  />
                  
                  {/* Celebration effect */}
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 1, scale: 0 }}
                        animate={{ 
                          opacity: 0, 
                          scale: 1,
                          x: Math.cos(i * 60 * Math.PI / 180) * 50,
                          y: Math.sin(i * 60 * Math.PI / 180) * 50
                        }}
                        transition={{ 
                          duration: 1,
                          delay: i * 0.1,
                          ease: "easeOut"
                        }}
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      >
                        <Star className="h-3 w-3 text-yellow-400" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Achievement details */}
              <div className="text-center space-y-2">
                <h4 className="font-semibold text-gray-900">
                  {achievement.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {achievement.description}
                </p>
                
                {/* XP reward */}
                <div className="flex justify-center">
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    <Trophy className="h-3 w-3 mr-1" />
                    +{achievement.xpValue} XP
                  </Badge>
                </div>
              </div>

              {/* Action button */}
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={handleClose}
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-medium"
                >
                  Awesome!
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}