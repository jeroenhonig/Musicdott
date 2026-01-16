import { Crown, Shield, GraduationCap, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface RoleIndicatorProps {
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'minimal';
}

export default function RoleIndicator({
  className,
  showIcon = true,
  showText = true,
  size = 'md',
  variant = 'badge'
}: RoleIndicatorProps) {
  const { user, currentSchool, isPlatformOwner, isSchoolOwner, isTeacher, isStudent } = useAuth();

  if (!user) return null;

  // Determine the highest role for display
  let roleInfo = {
    role: 'student',
    label: 'Student',
    icon: User,
    variant: 'outline' as const,
    color: 'text-blue-600'
  };

  if (isPlatformOwner()) {
    roleInfo = {
      role: 'platform_owner',
      label: 'Platform Owner',
      icon: Crown,
      variant: 'default' as const,
      color: 'text-yellow-600'
    };
  } else if (isSchoolOwner()) {
    roleInfo = {
      role: 'school_owner',
      label: 'School Owner',
      icon: Shield,
      variant: 'default' as const,
      color: 'text-purple-600'
    };
  } else if (isTeacher()) {
    roleInfo = {
      role: 'teacher',
      label: 'Teacher',
      icon: GraduationCap,
      variant: 'secondary' as const,
      color: 'text-green-600'
    };
  }

  const IconComponent = roleInfo.icon;
  
  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }[size];

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-medium">{roleInfo.label}</div>
      {currentSchool && (
        <div className="text-xs text-muted-foreground">
          {currentSchool.name}
          {currentSchool.membership && (
            <span className="ml-1">
              ({currentSchool.membership.role})
            </span>
          )}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        {user.name} • {user.email}
      </div>
    </div>
  );

  if (variant === 'minimal') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1', className)} data-testid="role-indicator">
            {showIcon && (
              <IconComponent className={cn(iconSize, roleInfo.color)} />
            )}
            {showText && (
              <span className={cn('text-sm font-medium', roleInfo.color)}>
                {roleInfo.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={roleInfo.variant} 
          className={cn('flex items-center gap-1', className)}
          data-testid="role-indicator"
        >
          {showIcon && <IconComponent className={iconSize} />}
          {showText && <span>{roleInfo.label}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

// Helper component for showing role in user profile areas
export function UserRoleDisplay({ user: propUser }: { user?: any }) {
  const { user: contextUser } = useAuth();
  const user = propUser || contextUser;
  
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <RoleIndicator size="sm" />
      <div className="text-sm text-muted-foreground">
        {user.name}
      </div>
    </div>
  );
}