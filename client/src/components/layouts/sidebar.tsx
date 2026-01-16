import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { 
  Home, 
  Users, 
  Music, 
  BookOpen, 
  Calendar, 
  BarChart, 
  Settings,
  LogOut,
  CreditCard,
  Trophy,
  MessageCircle,
  PlayCircle,
  Upload,
  Shield,
  GraduationCap,
  Search,
  Monitor,
  TrendingUp,
  Drum,
  Building,
  Crown,
  UserCog,
  Database
} from "lucide-react";
import logo from "../../assets/logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAnnounce } from "@/hooks/use-announce";
import ScreenReaderOnly from "../accessibility/screen-reader-only";
import { useTranslation } from "@/lib/i18n";
import RequireRole, { RequireTeacher, RequireSchoolOwner } from "@/components/rbac/require-role";
import SchoolPicker from "@/components/rbac/school-picker";
import RoleIndicator from "@/components/rbac/role-indicator";

interface SidebarProps {
  isMobile?: boolean;
  closeMobileMenu?: () => void;
}

export default function Sidebar({ isMobile = false, closeMobileMenu }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const announce = useAnnounce();
  const { t } = useTranslation();
  
  // Get unread message count for notification badge (teachers)
  const { data: teacherMessages = [] } = useQuery({
    queryKey: ["/api/teacher/messages"],
    enabled: user?.role !== 'student' // Only fetch for teachers
  });

  // Get unread responses count for notification badge (students)
  const { data: studentResponses = [] } = useQuery({
    queryKey: ["/api/student/message-responses"],
    enabled: user?.role === 'student' // Only fetch for students
  });
  
  const unreadTeacherCount = Array.isArray(teacherMessages) ? teacherMessages.filter((m: any) => !m.isRead).length : 0;
  const unreadResponseCount = Array.isArray(studentResponses) ? studentResponses.filter((m: any) => m.response && !m.responseRead).length : 0;
  
  const handleLogout = () => {
    logoutMutation.mutate();
    announce("Logging out", "assertive");
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };
  
  const NavLink = ({ 
    href, 
    icon, 
    children,
    badge 
  }: { 
    href: string, 
    icon: JSX.Element, 
    children: React.ReactNode,
    badge?: number
  }) => {
    const isActive = location === href;
    const linkClasses = isActive
      ? "bg-gray-100 text-foreground group flex items-center px-4 py-3 text-sm font-semibold rounded-xl"
      : "text-muted-foreground hover:bg-gray-100 hover:text-foreground group flex items-center px-4 py-3 text-sm font-medium rounded-xl";
    
    const iconClasses = isActive
      ? "text-primary mr-4 flex-shrink-0"
      : "text-muted-foreground group-hover:text-primary mr-4 flex-shrink-0";
    
    // Add aria-hidden to the icon for screen readers
    const iconWithClass = React.cloneElement(icon, { 
      className: iconClasses,
      "aria-hidden": "true" 
    });
    
    const handleClick = () => {
      if (isMobile && closeMobileMenu) {
        closeMobileMenu();
        announce(`Mobile menu closed`, "polite");
      }
      
      // Announce page change to screen readers
      announce(`Navigating to ${children}`, "polite");
    };

    return (
      <Link href={href} onClick={handleClick}>
        <div 
          className={linkClasses}
          aria-current={isActive ? "page" : undefined}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              {iconWithClass}
              {children}
            </div>
            {badge && badge > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                {badge}
              </span>
            )}
          </div>
          {isActive && (
            <ScreenReaderOnly>(current page)</ScreenReaderOnly>
          )}
        </div>
      </Link>
    );
  };
  
  return (
    <div 
      className={`flex flex-col w-full h-full apple-surface ${isMobile ? 'shadow-xl' : 'shadow-lg'}`}
      aria-label={isMobile ? "Mobile sidebar menu" : "Sidebar menu"}
    >
      <div className="flex-1 flex flex-col pt-8 pb-6 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6 mb-4">
          <div className="flex items-center p-3 rounded-2xl">
            <img src={logo} alt="MusicDott Logo" className="h-8" />
          </div>
        </div>
        
        {/* School Picker for users with multiple school memberships */}
        <div className="px-4 mb-6">
          <SchoolPicker className="w-full" />
        </div>
        <nav 
          className="mt-4 flex-1 px-4 space-y-2"
          aria-label="Main Navigation"
        >
          {/* Common Navigation for All Users */}
          <NavLink href="/" icon={<Home size={20} />}>
            {t('nav.dashboard')}
          </NavLink>

          {/* Student-Specific Navigation */}
          <RequireRole roles={['student']}>
            <NavLink href="/my-lessons" icon={<BookOpen size={20} />}>
              {t('nav.lessons')}
            </NavLink>
            <NavLink href="/my-assignments" icon={<Music size={20} />}>
              {t('nav.assignments')}
            </NavLink>
            <NavLink href="/my-schedule" icon={<Calendar size={20} />}>
              Mijn Agenda
            </NavLink>
            <NavLink href="/practice-sessions" icon={<PlayCircle size={20} />}>
              {t('nav.practice')}
            </NavLink>
            <NavLink href="/achievements" icon={<Trophy size={20} />}>
              {t('nav.achievements')}
            </NavLink>
            <NavLink href="/ask-teacher" icon={<MessageCircle size={20} />} badge={unreadResponseCount}>
              {t('nav.messages')}
            </NavLink>
          </RequireRole>

          {/* Teacher+ Navigation (Teachers, School Owners, Platform Owners) */}
          <RequireTeacher>
            <NavLink href="/students" icon={<Users size={20} />}>
              {t('nav.students')}
            </NavLink>
            <NavLink href="/lessons" icon={<BookOpen size={20} />}>
              {t('nav.lessons')}
            </NavLink>
            <NavLink href="/schedule" icon={<Calendar size={20} />}>
              Agenda
            </NavLink>
            <NavLink href="/songs" icon={<Music size={20} />}>
              Songs
            </NavLink>
            <NavLink href="/analytics" icon={<BarChart size={20} />}>
              Analytics & Reports
            </NavLink>
            <NavLink href="/messages" icon={<MessageCircle size={20} />} badge={unreadTeacherCount}>
              {t('nav.messages')}
            </NavLink>
            <NavLink href="/import" icon={<Upload size={20} />}>
              Import Data
            </NavLink>

            {/* Resources Section - Educational Content */}
            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Learning Hub
              </p>
              <NavLink href="/resources" icon={<GraduationCap size={20} />}>
                Resources & Guides
              </NavLink>
            </div>
          </RequireTeacher>

          {/* School Owner+ Navigation (School Owners, Platform Owners) */}
          <RequireSchoolOwner>
            <div className="pt-4 mt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                School Management
              </p>
              <NavLink href="/school/members" icon={<UserCog size={20} />}>
                Manage Members
              </NavLink>
              <NavLink href="/billing" icon={<CreditCard size={20} />}>
                Billing & Plans
              </NavLink>
              <NavLink href="/branding" icon={<Building size={20} />}>
                School Settings
              </NavLink>
            </div>
          </RequireSchoolOwner>


          {/* Common Settings - Available to All Users */}
          <div className="pt-4 mt-4 border-t border-gray-100">
            <NavLink href="/settings" icon={<Settings size={20} />}>
              {t('nav.settings')}
            </NavLink>
          </div>
        </nav>
      </div>
      <div 
        className="flex-shrink-0 flex border-t border-gray-200 p-4"
        role="contentinfo"
        aria-label="User profile"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar || ''} alt={user?.name || 'User'} />
              <AvatarFallback aria-hidden="true">{user ? getInitials(user.name) : 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <RoleIndicator size="sm" variant="minimal" />
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-500 flex-shrink-0"
            aria-label="Logout"
            data-testid="logout-button"
          >
            <LogOut size={18} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
