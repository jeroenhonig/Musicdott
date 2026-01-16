import React from "react";
import { Link, useLocation } from "wouter";
import { Home, Users, Music, BookOpen, Calendar, Trophy, PlayCircle, MessageCircle } from "lucide-react";
import { useAnnounce } from "@/hooks/use-announce";
import ScreenReaderOnly from "../accessibility/screen-reader-only";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

export default function MobileNavigation() {
  const [location] = useLocation();
  const announce = useAnnounce();
  const { user } = useAuth();

  // Get unread message count for notification badge
  const { data: teacherMessages = [] } = useQuery({
    queryKey: ["/api/teacher/messages"],
    enabled: user?.role !== 'student' // Only fetch for teachers
  });

  const { data: studentResponses = [] } = useQuery({
    queryKey: ["/api/student/message-responses"],
    enabled: user?.role === 'student' // Only fetch for students
  });
  
  const unreadTeacherCount = Array.isArray(teacherMessages) ? teacherMessages.filter((m: any) => !m.isRead).length : 0;
  const unreadResponseCount = Array.isArray(studentResponses) ? studentResponses.filter((m: any) => m.response && !m.responseRead).length : 0;
  
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
    const linkClasses = `flex flex-col items-center py-1 px-3 relative ${isActive ? 'text-primary' : 'text-gray-500'}`;
    
    // Enhanced icon with proper accessibility attributes
    const iconWithClass = React.cloneElement(icon, { 
      className: "h-5 w-5",
      "aria-hidden": "true" // Mark icon as hidden for screen readers as text already describes action
    });
    
    const handleClick = () => {
      // Announce page change to screen readers when clicked
      announce(`Navigating to ${children}`, "polite");
    };
    
    return (
      <Link href={href}>
        <a 
          className={linkClasses}
          aria-current={isActive ? "page" : undefined}
          onClick={handleClick}
        >
          {iconWithClass}
          <span className="text-xs mt-1">{children}</span>
          {badge && badge > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center">
              {badge}
            </span>
          )}
          {isActive && (
            <ScreenReaderOnly>(current page)</ScreenReaderOnly>
          )}
        </a>
      </Link>
    );
  };
  
  // Don't show mobile nav if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2"
      aria-label="Mobile navigation"
    >
      {/* Dashboard - Available to all users */}
      <NavLink href="/" icon={<Home />}>
        Home
      </NavLink>

      {/* Student-specific navigation */}
      {user.role === 'student' && (
        <>
          <NavLink href="/my-lessons" icon={<BookOpen />}>
            Lessons
          </NavLink>
          <NavLink href="/my-assignments" icon={<Music />}>
            Assignments
          </NavLink>
          <NavLink href="/practice-sessions" icon={<PlayCircle />}>
            Practice
          </NavLink>
          <NavLink href="/ask-teacher" icon={<MessageCircle />} badge={unreadResponseCount}>
            Messages
          </NavLink>
        </>
      )}

      {/* Teacher+ navigation (Teachers, School Owners, Platform Owners) */}
      {user.role !== 'student' && (
        <>
          <NavLink href="/students" icon={<Users />}>
            Students
          </NavLink>
          <NavLink href="/lessons" icon={<BookOpen />}>
            Lessons
          </NavLink>
          <NavLink href="/schedule" icon={<Calendar />}>
            Schedule
          </NavLink>
          <NavLink href="/messages" icon={<MessageCircle />} badge={unreadTeacherCount}>
            Messages
          </NavLink>
        </>
      )}
    </nav>
  );
}
