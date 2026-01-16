/**
 * Class Leaderboard Component
 * Shows ranking of students in a class
 */

import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LeaderboardEntry {
  studentId: string;
  name: string;
  points: number;
  streak: number;
  change: string;
}

export function ClassLeaderboard({ classId }: { classId: string }) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  
  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: [`/api/gamification/classes/${classId}/leaderboard`, { range: timeRange }],
  });

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="w-5 text-center font-bold text-gray-500">{position}</span>;
    }
  };

  const getChangeIcon = (change: string) => {
    const num = parseInt(change);
    if (num > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (num < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Class Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Class Leaderboard
          </CardTitle>
          
          <div className="flex gap-1">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {leaderboard?.map((entry, index) => (
            <div
              key={entry.studentId}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                index === 0 
                  ? 'bg-yellow-50 border-yellow-200' 
                  : index === 1 
                    ? 'bg-gray-50 border-gray-200'
                    : index === 2
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-gray-100'
              }`}
            >
              {/* Rank */}
              <div className="flex-shrink-0">
                {getRankIcon(index + 1)}
              </div>
              
              {/* Student Info */}
              <div className="flex-1">
                <div className="font-medium text-gray-900">{entry.name}</div>
                <div className="text-sm text-gray-500">
                  {entry.streak} day streak
                </div>
              </div>
              
              {/* Points */}
              <div className="text-right">
                <div className="font-bold text-blue-600">
                  {entry.points} pts
                </div>
                <div className="flex items-center gap-1 justify-end">
                  {getChangeIcon(entry.change)}
                  <span className="text-xs text-gray-500">
                    {entry.change !== '0' && entry.change}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {(!leaderboard || leaderboard.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            No students in this class yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TeacherAwardDialog({ 
  studentId, 
  studentName, 
  isOpen, 
  onClose, 
  onAward 
}: {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
  onAward: (points: number, reason: string) => void;
}) {
  const [points, setPoints] = useState(10);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onAward(points, reason);
      setReason('');
      setPoints(10);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle>Award Points to {studentName}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Points</label>
              <select 
                value={points} 
                onChange={(e) => setPoints(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value={5}>5 points</option>
                <option value={10}>10 points</option>
                <option value={25}>25 points</option>
                <option value={50}>50 points</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Great technique improvement, excellent practice session, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none"
                required
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Award {points} Points
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}