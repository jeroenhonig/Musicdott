import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CompactLanguageSelector } from "@/components/language/language-selector";
import musicdottLogo from "@/assets/musicdott-logo.png";

interface LandingNavProps {
  onLoginClick: () => void;
}

export function LandingNav({ onLoginClick }: LandingNavProps) {
  const [, navigate] = useLocation();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-12 h-14 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <img src={musicdottLogo} alt="Musicdott" className="h-8 w-auto" />
      <div className="flex items-center gap-2">
        <CompactLanguageSelector />
        <Button variant="ghost" size="sm" onClick={onLoginClick}>
          Inloggen
        </Button>
        <Button size="sm" onClick={() => navigate("/signup")}>
          Account aanmaken
        </Button>
      </div>
    </nav>
  );
}
