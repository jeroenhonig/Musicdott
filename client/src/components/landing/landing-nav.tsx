import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CompactLanguageSelector } from "@/components/language/language-selector";
import musicdottLogo from "@/assets/musicdott-logo.png";
import { useTranslation } from "@/lib/i18n";

interface LandingNavProps {
  onLoginClick: () => void;
}

export function LandingNav({ onLoginClick }: LandingNavProps) {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-12 h-16 bg-white/95 backdrop-blur-xl border-b border-gray-200">
      <img src={musicdottLogo} alt="MusicDott" className="h-9 w-auto" />
      <div className="flex items-center gap-2">
        <CompactLanguageSelector />
        <Button variant="ghost" size="sm" onClick={onLoginClick}>
          {t('landing.nav.login')}
        </Button>
        <Button
          size="sm"
          className="bg-[#1B2B6B] hover:bg-[#1B2B6B]/90 text-white"
          onClick={() => navigate("/signup")}
        >
          {t('landing.nav.startFree')}
        </Button>
      </div>
    </nav>
  );
}
