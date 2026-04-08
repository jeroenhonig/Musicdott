/**
 * Avatar Customization Page
 */

import { AvatarCustomizer } from "@/components/avatar/avatar-customizer";
import { useTranslation } from "@/lib/i18n";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function AvatarPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const handleSave = () => {
    setLocation("/profile");
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/profile">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('avatar.title')}</h1>
          <p className="text-muted-foreground">
            {t('avatar.subtitle')}
          </p>
        </div>
      </div>

      <AvatarCustomizer onSave={handleSave} />
    </div>
  );
}
