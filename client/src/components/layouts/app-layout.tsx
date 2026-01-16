import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./sidebar";
import MobileHeader from "./mobile-header";
import MobileNavigation from "./mobile-navigation";
import WelcomeAnimation from "../welcome-animation";
import GestureNavigation from "../gesture-navigation";
import SkipLink from "../accessibility/skip-link";
import { useAnnounce } from "@/hooks/use-announce";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const announce = useAnnounce();
  
  // Session storage key to track if welcome animation has been shown
  const WELCOME_SHOWN_KEY = "musicdott_welcome_shown";
  
  useEffect(() => {
    // Check if we've already shown the welcome animation in this session
    const hasWelcomeBeenShown = sessionStorage.getItem(WELCOME_SHOWN_KEY);
    if (hasWelcomeBeenShown) {
      setShowWelcome(false);
    } else {
      setShowWelcome(true);
    }
    
    // Announce the page title to screen readers
    announce(`${title} page loaded`, "polite");
  }, [title, announce]);
  
  const handleWelcomeComplete = () => {
    // Mark as shown for this session
    sessionStorage.setItem(WELCOME_SHOWN_KEY, "true");
    setShowWelcome(false);
    announce("Welcome to Musicdott", "polite");
  };
  
  const toggleMobileMenu = () => {
    const newState = !mobileMenuOpen;
    setMobileMenuOpen(newState);
    
    // Announce menu state change to screen readers
    if (newState) {
      announce("Menu opened", "polite");
    } else {
      announce("Menu closed", "polite");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Skip to main content link - only visible when keyboard focused */}
      <SkipLink targetId="main-content" />
      
      {/* Welcome Animation */}
      {showWelcome && <WelcomeAnimation onComplete={handleWelcomeComplete} />}
      
      {/* Main Layout Container */}
      <div className="flex min-h-screen">
        {/* Desktop Sidebar - Fixed positioned, only visible on desktop */}
        <aside className="hidden md:flex md:flex-shrink-0 md:w-64 liquid-glass-sidebar">
          <Sidebar />
        </aside>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header - Only visible on mobile */}
          <div className="md:hidden">
            <MobileHeader toggleMobileMenu={toggleMobileMenu} />
          </div>
          
          {/* Main Content */}
          <main 
            id="main-content" 
            className="flex-1 bg-transparent"
            tabIndex={-1}
          >
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <div role="region" aria-label="Page content">
                  <div className="hidden md:block">
                    {children}
                  </div>
                  <div className="block md:hidden">
                    <GestureNavigation>
                      {children}
                    </GestureNavigation>
                  </div>
                </div>
              </div>
            </div>
          </main>
          
          {/* Mobile Bottom Navigation - Only visible on mobile */}
          <div className="md:hidden">
            <nav role="navigation" aria-label="Mobile Navigation">
              <MobileNavigation />
            </nav>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Overlay - Only for mobile slide-out menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          role="presentation"
          aria-hidden="true"
        />
      )}
      
      {/* Mobile Menu Sidebar - Slide-out menu for mobile */}
      <div 
        className={`fixed inset-y-0 left-0 transform ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out z-50 md:hidden`}
        role="dialog"
        aria-modal={mobileMenuOpen}
        aria-label="Mobile menu"
      >
        <div className="h-full w-64 bg-white shadow-xl border-r border-gray-200">
          <Sidebar isMobile={true} closeMobileMenu={() => setMobileMenuOpen(false)} />
        </div>
      </div>
    </div>
  );
}