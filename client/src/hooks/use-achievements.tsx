import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { AchievementDefinition, StudentAchievement } from '@shared/schema';
import { useState, useEffect } from 'react';

// Fetch all achievement definitions
export function useAchievementDefinitions() {
  return useQuery<AchievementDefinition[]>({
    queryKey: ['/api/achievements'],
    enabled: true,
  });
}

// Fetch student achievements
export function useStudentAchievements(studentId: number) {
  return useQuery<StudentAchievement[]>({
    queryKey: [`/api/students/${studentId}/achievements`],
    enabled: !!studentId,
  });
}

// Check for new achievements for a student
export function useCheckAchievements(studentId: number) {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/students/${studentId}/achievements/check`);
      return await res.json() as StudentAchievement[];
    },
    onSuccess: (newAchievements) => {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/achievements`] });
      return newAchievements;
    },
  });
}

// Combined hook to manage achievement notifications
export function useAchievementNotifications(studentId: number) {
  const [newAchievements, setNewAchievements] = useState<StudentAchievement[]>([]);
  const [currentAchievementIndex, setCurrentAchievementIndex] = useState<number>(-1);
  
  const { data: achievementDefinitions = [] } = useAchievementDefinitions();
  const { data: studentAchievements = [] } = useStudentAchievements(studentId);
  
  // Find any unseen achievements
  useEffect(() => {
    if (studentAchievements.length > 0) {
      const unseen = studentAchievements.filter(a => a.isNew);
      if (unseen.length > 0 && newAchievements.length === 0) {
        setNewAchievements(unseen);
        setCurrentAchievementIndex(0);
      }
    }
  }, [studentAchievements, newAchievements.length]);
  
  // Get the current achievement to show
  const currentAchievement = currentAchievementIndex >= 0 ? newAchievements[currentAchievementIndex] : undefined;
  
  // Get the definition for the current achievement
  const currentAchievementDefinition = currentAchievement 
    ? achievementDefinitions.find(a => a.id === currentAchievement.achievementId)
    : undefined;
  
  // Handle when a notification is closed
  const handleNotificationClosed = () => {
    if (currentAchievementIndex < newAchievements.length - 1) {
      // Move to next achievement
      setCurrentAchievementIndex(currentAchievementIndex + 1);
    } else {
      // No more achievements to show
      setNewAchievements([]);
      setCurrentAchievementIndex(-1);
    }
  };
  
  // Check for new achievements
  const checkAchievements = useCheckAchievements(studentId);
  
  const checkForNewAchievements = async () => {
    if (studentId) {
      const newAchievements = await checkAchievements.mutateAsync();
      if (newAchievements.length > 0) {
        setNewAchievements(newAchievements);
        setCurrentAchievementIndex(0);
      }
    }
  };
  
  return {
    currentAchievement,
    currentAchievementDefinition,
    handleNotificationClosed,
    checkForNewAchievements,
    isCheckingAchievements: checkAchievements.isPending,
  };
}