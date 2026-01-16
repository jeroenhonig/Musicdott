/**
 * Rewards Store Component
 * Students can redeem their gamification points for rewards
 */

import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingBag, Star, Gift, Music, Trophy, Sparkles, Crown, Zap, Target, Award, Coins } from "lucide-react";

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: "badge" | "avatar" | "feature" | "physical";
  icon: string;
  available: boolean;
  limited?: boolean;
  stock?: number;
}

interface StudentProgress {
  totalPoints: number;
  currentStreak: number;
  badges: string[];
}

const REWARDS: Reward[] = [
  {
    id: "badge-rockstar",
    name: "Rockstar Badge",
    description: "Show off your dedication with this exclusive badge on your profile",
    pointsCost: 100,
    category: "badge",
    icon: "star",
    available: true,
  },
  {
    id: "badge-maestro",
    name: "Maestro Badge",
    description: "The ultimate badge for serious musicians",
    pointsCost: 500,
    category: "badge",
    icon: "crown",
    available: true,
  },
  {
    id: "avatar-gold-frame",
    name: "Gold Avatar Frame",
    description: "Add a golden frame around your avatar",
    pointsCost: 200,
    category: "avatar",
    icon: "sparkles",
    available: true,
  },
  {
    id: "avatar-animated",
    name: "Animated Avatar",
    description: "Your avatar comes to life with subtle animations",
    pointsCost: 350,
    category: "avatar",
    icon: "zap",
    available: true,
  },
  {
    id: "feature-custom-theme",
    name: "Custom Theme",
    description: "Unlock additional color themes for your dashboard",
    pointsCost: 300,
    category: "feature",
    icon: "palette",
    available: true,
  },
  {
    id: "feature-practice-insights",
    name: "Advanced Practice Insights",
    description: "Unlock detailed analytics about your practice sessions",
    pointsCost: 450,
    category: "feature",
    icon: "target",
    available: true,
  },
  {
    id: "physical-sticker-pack",
    name: "MusicDott Sticker Pack",
    description: "Real stickers delivered to your door (ask your teacher)",
    pointsCost: 1000,
    category: "physical",
    icon: "gift",
    limited: true,
    stock: 10,
    available: true,
  },
  {
    id: "physical-certificate",
    name: "Achievement Certificate",
    description: "A personalized printed certificate celebrating your progress",
    pointsCost: 750,
    category: "physical",
    icon: "award",
    available: true,
  },
];

const CATEGORY_LABELS = {
  badge: "Badges",
  avatar: "Avatar Items",
  feature: "Features",
  physical: "Physical Rewards",
};

const ICONS: Record<string, typeof Star> = {
  star: Star,
  crown: Crown,
  sparkles: Sparkles,
  zap: Zap,
  gift: Gift,
  target: Target,
  award: Award,
  palette: Trophy,
};

function RewardCard({ 
  reward, 
  userPoints, 
  onRedeem,
  isRedeeming
}: { 
  reward: Reward; 
  userPoints: number;
  onRedeem: (reward: Reward) => void;
  isRedeeming: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const canAfford = userPoints >= reward.pointsCost;
  const Icon = ICONS[reward.icon] || Gift;

  return (
    <Card className={`transition-all ${canAfford ? "hover:shadow-lg" : "opacity-60"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-lg ${
            reward.category === "badge" ? "bg-yellow-100 text-yellow-700" :
            reward.category === "avatar" ? "bg-purple-100 text-purple-700" :
            reward.category === "feature" ? "bg-blue-100 text-blue-700" :
            "bg-green-100 text-green-700"
          }`}>
            <Icon className="h-6 w-6" />
          </div>
          {reward.limited && (
            <Badge variant="secondary" className="text-xs">
              Limited: {reward.stock} left
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg mt-2">{reward.name}</CardTitle>
        <CardDescription>{reward.description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1 text-amber-600 font-semibold">
          <Coins className="h-4 w-4" />
          {reward.pointsCost}
        </div>
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogTrigger asChild>
            <Button 
              disabled={!canAfford || isRedeeming}
              size="sm"
              data-testid={`button-redeem-${reward.id}`}
            >
              {canAfford ? "Redeem" : "Not enough points"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Redemption</DialogTitle>
              <DialogDescription>
                Are you sure you want to redeem <strong>{reward.name}</strong> for <strong>{reward.pointsCost} points</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className={`p-3 rounded-lg ${
                reward.category === "badge" ? "bg-yellow-100 text-yellow-700" :
                reward.category === "avatar" ? "bg-purple-100 text-purple-700" :
                reward.category === "feature" ? "bg-blue-100 text-blue-700" :
                "bg-green-100 text-green-700"
              }`}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <h4 className="font-semibold">{reward.name}</h4>
                <p className="text-sm text-muted-foreground">{reward.description}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  onRedeem(reward);
                  setShowConfirm(false);
                }}
                disabled={isRedeeming}
              >
                {isRedeeming ? "Redeeming..." : "Confirm Redemption"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

export function RewardsStore() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: progress, isLoading: progressLoading } = useQuery<StudentProgress>({
    queryKey: ["/api/gamification/me/summary"],
  });

  const redeemMutation = useMutation({
    mutationFn: async (reward: Reward) => {
      return apiRequest("POST", "/api/gamification/rewards/redeem", {
        rewardId: reward.id,
        pointsCost: reward.pointsCost,
      });
    },
    onSuccess: (_, reward) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/me/summary"] });
      toast({
        title: "Reward Redeemed!",
        description: `You've successfully redeemed ${reward.name}!`,
      });
    },
    onError: () => {
      toast({
        title: "Redemption Failed",
        description: "There was an error redeeming your reward. Please try again.",
        variant: "destructive",
      });
    },
  });

  const userPoints = progress?.totalPoints || 0;
  
  const filteredRewards = REWARDS.filter(
    (r) => selectedCategory === "all" || r.category === selectedCategory
  );

  const categories = ["all", ...Object.keys(CATEGORY_LABELS)] as const;

  if (progressLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="rewards-store">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Rewards Store
              </CardTitle>
              <CardDescription>
                Redeem your points for exclusive rewards
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-2xl font-bold text-amber-600">
                <Coins className="h-6 w-6" />
                {userPoints}
              </div>
              <p className="text-sm text-muted-foreground">Available Points</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                data-testid={`button-category-${category}`}
              >
                {category === "all" ? "All Rewards" : CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
              </Button>
            ))}
          </div>

          {filteredRewards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rewards available in this category</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  userPoints={userPoints}
                  onRedeem={(r) => redeemMutation.mutate(r)}
                  isRedeeming={redeemMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            How to Earn Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Music className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Practice</h4>
                <p className="text-sm text-muted-foreground">10 points per session</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Target className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Complete Assignments</h4>
                <p className="text-sm text-muted-foreground">25 points each</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Zap className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Daily Streak</h4>
                <p className="text-sm text-muted-foreground">5 bonus points/day</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Award className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Earn Badges</h4>
                <p className="text-sm text-muted-foreground">50-200 points each</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RewardsStore;
