import { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface RequireRoleProps {
  roles: string[];
  schoolId?: number;
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, user must have ALL roles, otherwise ANY role
}

/**
 * RequireRole component for conditional rendering based on user roles
 * 
 * @param roles - Array of required roles (platform_owner, school_owner, teacher, student)
 * @param schoolId - Optional school ID to check role for specific school
 * @param children - Content to render if user has required role(s)
 * @param fallback - Content to render if user doesn't have required role(s)
 * @param requireAll - If true, user must have ALL roles, otherwise ANY role (default: false)
 */
export default function RequireRole({ 
  roles, 
  schoolId, 
  children, 
  fallback = null,
  requireAll = false 
}: RequireRoleProps) {
  const { hasRole, user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  let hasRequiredRole: boolean;

  if (requireAll) {
    // User must have ALL specified roles
    hasRequiredRole = roles.every(role => hasRole(role, schoolId));
  } else {
    // User must have ANY of the specified roles
    hasRequiredRole = roles.some(role => hasRole(role, schoolId));
  }

  return hasRequiredRole ? <>{children}</> : <>{fallback}</>;
}

// Helper components for common role combinations
export function RequireTeacher({ children, schoolId, fallback }: { 
  children: ReactNode; 
  schoolId?: number; 
  fallback?: ReactNode; 
}) {
  return (
    <RequireRole roles={['teacher', 'school_owner', 'platform_owner']} schoolId={schoolId} fallback={fallback}>
      {children}
    </RequireRole>
  );
}

export function RequireSchoolOwner({ children, schoolId, fallback }: { 
  children: ReactNode; 
  schoolId?: number; 
  fallback?: ReactNode; 
}) {
  return (
    <RequireRole roles={['school_owner', 'platform_owner']} schoolId={schoolId} fallback={fallback}>
      {children}
    </RequireRole>
  );
}

export function RequirePlatformOwner({ children, fallback }: { 
  children: ReactNode; 
  fallback?: ReactNode; 
}) {
  return (
    <RequireRole roles={['platform_owner']} fallback={fallback}>
      {children}
    </RequireRole>
  );
}