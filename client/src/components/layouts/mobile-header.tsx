import { useAuth } from "@/hooks/use-auth";
import { Music, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAnnounce } from "@/hooks/use-announce";
import { NotificationBell } from "@/components/notification-bell";

interface MobileHeaderProps {
  toggleMobileMenu: () => void;
}

export default function MobileHeader({ toggleMobileMenu }: MobileHeaderProps) {
  const { user } = useAuth();
  const announce = useAnnounce();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };
  
  const handleMenuToggle = () => {
    toggleMobileMenu();
    // No need to announce here as we're already announcing in AppLayout's toggleMobileMenu function
  };
  
  return (
    <header 
      className="sticky top-0 z-10 md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200"
      role="banner"
    >
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMenuToggle}
          className="text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
          aria-label="Toggle navigation menu"
          aria-expanded="false" // This should ideally be dynamically set based on menu state
          aria-controls="mobile-menu"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </Button>
        <div className="ml-4 flex items-center" aria-label="Application logo">
          <Music className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="ml-2 text-lg font-bold text-gray-900">MusicDott</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Avatar 
          className="h-8 w-8"
          aria-label={user?.name ? `${user.name}'s profile` : "User profile"}
        >
          <AvatarImage src={user?.avatar || ''} alt="" /> {/* alt is empty because aria-label on Avatar provides the accessible name */}
          <AvatarFallback aria-hidden="true">{user ? getInitials(user.name) : 'U'}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
