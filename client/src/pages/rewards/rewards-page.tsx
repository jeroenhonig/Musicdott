/**
 * Rewards Store Page
 */

import { RewardsStore } from "@/components/gamification/rewards-store";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";

export default function RewardsPage() {
  const { t } = useTranslation();

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('rewards.title')}</h1>
          <p className="text-muted-foreground">
            {t('rewards.subtitle')}
          </p>
        </div>
      </div>

      <RewardsStore />
    </div>
  );
}
