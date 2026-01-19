import { Request, Response, NextFunction, RequestHandler } from 'express';
import { storage } from '../storage-wrapper';
import { User, SchoolMembership, USER_ROLES } from '@shared/schema';

// Async handler wrapper to convert async middleware to proper RequestHandler types
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler => 
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

// Extend Express Request type to include school context
declare global {
  namespace Express {
    interface Request {
      school?: SchoolContext;
    }
  }
}

// School context interface
export interface SchoolContext {
  id: number;
  role: SchoolRole;
  userId: number;
  memberships: SchoolMembership[];
  canAccessSchool: (schoolId: number) => boolean;
  hasRole: (role: SchoolRole | SchoolRole[], schoolId?: number) => boolean;
  isPlatformOwner: () => boolean;
  isSchoolOwner: (schoolId?: number) => boolean;
  isTeacher: (schoolId?: number) => boolean;
  isStudent: (schoolId?: number) => boolean;
}

// Role types
export type SchoolRole = 'owner' | 'teacher' | 'student' | 'platform_owner';
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Role hierarchy for access control
const ROLE_HIERARCHY: Record<SchoolRole, number> = {
  'platform_owner': 100,
  'owner': 50,
  'teacher': 30,
  'student': 10
};

/**
 * Middleware to load school context from authenticated user
 * Must be used after authentication middleware
 */
export const loadSchoolContext: RequestHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return next();
    }

    const user = req.user as User;
    
    // Get user's school memberships
    let memberships: SchoolMembership[] = [];
    try {
      memberships = await storage.getUserSchoolMemberships(user.id);
    } catch (error) {
      console.warn('Failed to load school memberships:', error);
      // Continue with empty memberships - platform owners might not have school memberships
    }

    // Determine primary school and role
    let primarySchoolId = user.schoolId;
    let primaryRole: SchoolRole;

    // Handle platform owners
    if (user.role === USER_ROLES.PLATFORM_OWNER) {
      primaryRole = 'platform_owner';
      primarySchoolId = primarySchoolId || 0; // Platform owners can access any school
    } 
    // Handle school owners
    else if (user.role === USER_ROLES.SCHOOL_OWNER) {
      primaryRole = 'owner';
      // For school owners, try to get their owned school
      if (!primarySchoolId && memberships.length > 0) {
        const ownerMembership = memberships.find(m => m.role === 'owner');
        if (ownerMembership) {
          primarySchoolId = ownerMembership.schoolId;
        }
      }
    }
    // Handle teachers
    else if (user.role === USER_ROLES.TEACHER) {
      primaryRole = 'teacher';
      // For teachers, use their school or find from memberships
      if (!primarySchoolId && memberships.length > 0) {
        const teacherMembership = memberships.find(m => m.role === 'teacher') || memberships[0];
        primarySchoolId = teacherMembership.schoolId;
      }
    }
    // Handle students
    else {
      primaryRole = 'student';
      // Students should always have a schoolId
      if (!primarySchoolId) {
        console.warn(`Student user ${user.id} has no schoolId`);
        res.status(400).json({ 
          message: 'Student account not properly configured. Please contact your school administrator.' 
        });
        return;
      }
    }

    // Log school context setup for debugging
    console.log(`🏫 loadSchoolContext - user: ${user.id}, role: ${user.role}, userSchoolId: ${user.schoolId}, primarySchoolId: ${primarySchoolId}, memberships: ${memberships.length}`);

    // Create school context
    // Platform owners can have id=0 (they access all schools), others need a real schoolId
    const schoolContext: SchoolContext = {
      id: primarySchoolId ?? (primaryRole === 'platform_owner' ? 0 : 0),
      role: primaryRole,
      userId: user.id,
      memberships,

      // Helper methods
      canAccessSchool: (schoolId: number): boolean => {
        // Platform owners can access any school
        if (primaryRole === 'platform_owner') return true;
        
        // Check if user has membership in the school
        return memberships.some(m => m.schoolId === schoolId) || primarySchoolId === schoolId;
      },

      hasRole: (roles: SchoolRole | SchoolRole[], schoolId?: number): boolean => {
        const roleList = Array.isArray(roles) ? roles : [roles];
        const targetSchoolId = schoolId || primarySchoolId;

        // Platform owners have all roles
        if (primaryRole === 'platform_owner') return true;

        // Check primary role
        if (roleList.includes(primaryRole)) {
          if (!schoolId || primarySchoolId === targetSchoolId) return true;
        }

        // Check membership roles
        if (targetSchoolId) {
          const membership = memberships.find(m => m.schoolId === targetSchoolId);
          if (membership && roleList.includes(membership.role as SchoolRole)) {
            return true;
          }
        }

        return false;
      },

      isPlatformOwner: (): boolean => primaryRole === 'platform_owner',
      
      isSchoolOwner: (schoolId?: number): boolean => {
        if (primaryRole === 'platform_owner') return true;
        const targetSchoolId = schoolId || primarySchoolId;
        return primaryRole === 'owner' && (!schoolId || primarySchoolId === targetSchoolId) ||
               memberships.some(m => m.schoolId === targetSchoolId && m.role === 'owner');
      },

      isTeacher: (schoolId?: number): boolean => {
        if (primaryRole === 'platform_owner') return true;
        const targetSchoolId = schoolId || primarySchoolId;
        return primaryRole === 'teacher' && (!schoolId || primarySchoolId === targetSchoolId) ||
               memberships.some(m => m.schoolId === targetSchoolId && m.role === 'teacher');
      },

      isStudent: (schoolId?: number): boolean => {
        // Platform owners are NOT students - they have access through other means
        if (primaryRole === 'platform_owner') return false;
        const targetSchoolId = schoolId || primarySchoolId;
        return primaryRole === 'student' && (!schoolId || primarySchoolId === targetSchoolId);
      }
    };

    req.school = schoolContext;
    next();
  } catch (error) {
    console.error('Error loading school context:', error);
    res.status(500).json({ message: 'Failed to load user context' });
  }
});

/**
 * Middleware to require specific school roles
 */
export const requireSchoolRole = (...requiredRoles: SchoolRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!req.school) {
      res.status(500).json({ message: 'School context not loaded' });
      return;
    }

    const hasRequiredRole = requiredRoles.some(role => req.school!.hasRole(role));
    
    if (!hasRequiredRole) {
      res.status(403).json({ 
        message: 'Insufficient permissions for this operation',
        required: requiredRoles,
        current: req.school.role
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require platform owner role
 */
export const requirePlatformOwner = (): RequestHandler => {
  return requireSchoolRole('platform_owner');
};

/**
 * Middleware to require school owner role - SIMPLIFIED VERSION
 */
export const requireSchoolOwner = (): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const user = req.user as User;
    
    // SIMPLIFIED: Just check user role directly
    if (user.role === USER_ROLES.PLATFORM_OWNER || 
        user.role === USER_ROLES.SCHOOL_OWNER) {
      return next();
    }

    res.status(403).json({ 
      message: 'School owner permissions required for this operation'
    });
  };
};

/**
 * Middleware to require teacher or owner role - SIMPLIFIED VERSION
 */
export const requireTeacherOrOwner = (): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("requireTeacherOrOwner - isAuth:", req.isAuthenticated(), "user:", req.user?.id, "role:", (req.user as User)?.role, "schoolId:", (req.user as User)?.schoolId);
    
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const user = req.user as User;
    
    // SIMPLIFIED: Just check user role directly, no complex school membership logic
    if (user.role === USER_ROLES.PLATFORM_OWNER || 
        user.role === USER_ROLES.SCHOOL_OWNER || 
        user.role === USER_ROLES.TEACHER) {
      console.log("requireTeacherOrOwner - ALLOWED for role:", user.role);
      return next();
    }

    console.log("requireTeacherOrOwner - DENIED for role:", user.role);
    res.status(403).json({ 
      message: 'School or teacher permissions required for this operation'
    });
  };
};

/**
 * Middleware to require same school access
 */
export const requireSameSchool = (): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!req.school) {
      res.status(500).json({ message: 'School context not loaded' });
      return;
    }

    const schoolId = extractSchoolIdFromRequest(req);
    
    if (schoolId && !req.school.canAccessSchool(schoolId)) {
      res.status(403).json({ 
        message: 'Access denied. You can only access data from your school.'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to validate resource ownership or school access
 */
export const requireResourceAccess = (options: {
  resourceType: 'student' | 'lesson' | 'song' | 'assignment' | 'session';
  allowOwner?: boolean;
  allowTeacher?: boolean;
  allowStudent?: boolean;
  checkCreator?: boolean;
}): RequestHandler => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      if (!req.school) {
        res.status(500).json({ message: 'School context not loaded' });
        return;
      }

      const resourceId = parseInt(req.params.id);
      if (isNaN(resourceId)) {
        res.status(400).json({ message: 'Invalid resource ID' });
        return;
      }

      // Platform owners have full access
      if (req.school.isPlatformOwner()) {
        return next();
      }

      // Get the resource to check school ownership
      let resource: any = null;
      
      try {
        switch (options.resourceType) {
          case 'student':
            resource = await storage.getStudent(resourceId);
            break;
          case 'lesson':
            resource = await storage.getLesson(resourceId);
            break;
          case 'song':
            resource = await storage.getSong(resourceId);
            break;
          case 'assignment':
            resource = await storage.getAssignment(resourceId);
            break;
          case 'session':
            resource = await storage.getSession(resourceId);
            break;
        }
      } catch (error) {
        console.error(`Error fetching ${options.resourceType}:`, error);
        res.status(500).json({ message: `Failed to verify ${options.resourceType} access` });
        return;
      }

      if (!resource) {
        res.status(404).json({ message: `${options.resourceType} not found` });
        return;
      }

      // Check school ownership
      if (resource.schoolId && !req.school.canAccessSchool(resource.schoolId)) {
        res.status(403).json({ 
          message: 'Access denied. Resource belongs to a different school.' 
        });
        return;
      }

      // Check role-based permissions
      const schoolId = resource.schoolId || req.school.id;
      
      if (options.allowOwner && req.school.isSchoolOwner(schoolId)) {
        return next();
      }

      if (options.allowTeacher && req.school.isTeacher(schoolId)) {
        // Additional check for teacher-specific resources
        if (options.resourceType === 'student') {
          // Teachers can only access their assigned students
          const student = resource;
          if (student.assignedTeacherId === req.user!.id) {
            return next();
          }
        } else if (options.checkCreator && resource.userId === req.user!.id) {
          // Teachers can access resources they created
          return next();
        } else if (options.allowTeacher) {
          // For other resources, teachers have general access within their school
          return next();
        }
      }

      if (options.allowStudent && req.school.isStudent(schoolId)) {
        // Students can only access their own resources
        if (options.resourceType === 'student' && resource.userId === req.user!.id) {
          return next();
        }
        // For other resources, check if they're assigned to this student
        if (resource.studentId === req.user!.id) {
          return next();
        }
      }

      res.status(403).json({ 
        message: 'Insufficient permissions to access this resource'
      });
      return;

    } catch (error) {
      console.error('Error in requireResourceAccess:', error);
      res.status(500).json({ message: 'Failed to verify resource access' });
    }
  });
};

/**
 * Middleware to filter data based on school access
 */
export const applySchoolFiltering = (): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!req.school) {
      res.status(500).json({ message: 'School context not loaded' });
      return;
    }

    // Add school filtering info to request for use in routes
    req.schoolFilter = {
      schoolId: req.school.id,
      role: req.school.role,
      userId: req.user!.id,
      canAccessAllSchools: req.school.isPlatformOwner(),
      schoolIds: req.school.memberships.map(m => m.schoolId).concat(req.school.id).filter((id, index, arr) => arr.indexOf(id) === index)
    };

    next();
  };
};

// Extend Request interface for school filtering
declare global {
  namespace Express {
    interface Request {
      schoolFilter?: {
        schoolId: number;
        role: SchoolRole;
        userId: number;
        canAccessAllSchools: boolean;
        schoolIds: number[];
      };
    }
  }
}

/**
 * Helper function to extract schoolId from request
 */
function extractSchoolIdFromRequest(req: Request): number | undefined {
  // Try to get schoolId from various sources
  if (req.params.schoolId) {
    return parseInt(req.params.schoolId);
  }
  if (req.query.schoolId) {
    return parseInt(req.query.schoolId as string);
  }
  if (req.body.schoolId) {
    return parseInt(req.body.schoolId);
  }
  // Fallback to user's primary school
  return req.school?.id;
}

/**
 * Utility function to check role hierarchy
 */
export const hasRoleLevel = (userRole: SchoolRole, requiredRole: SchoolRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Middleware factory for custom authorization logic
 */
export const requireCustomAccess = (
  checkFunction: (req: Request, res: Response) => Promise<boolean> | boolean
): RequestHandler => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      if (!req.school) {
        res.status(500).json({ message: 'School context not loaded' });
        return;
      }

      const hasAccess = await checkFunction(req, res);
      
      if (!hasAccess) {
        res.status(403).json({ 
          message: 'Access denied for this operation'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error in custom access check:', error);
      res.status(500).json({ message: 'Failed to verify access permissions' });
    }
  });
};

/**
 * Convenience middleware combinations
 */

// Common authorization patterns
export const teacherOrOwnerAccess = () => requireTeacherOrOwner();
export const ownerOnlyAccess = () => requireSchoolOwner();
export const platformOwnerAccess = () => requirePlatformOwner();
export const sameSchoolAccess = () => requireSameSchool();

// Resource-specific access patterns
export const studentAccess = (options: { allowOwner?: boolean; allowTeacher?: boolean; allowStudent?: boolean } = {}) => 
  requireResourceAccess({ 
    resourceType: 'student', 
    allowOwner: options.allowOwner ?? true,
    allowTeacher: options.allowTeacher ?? true,
    allowStudent: options.allowStudent ?? false,
    checkCreator: false
  });

export const lessonAccess = (options: { allowOwner?: boolean; allowTeacher?: boolean; allowStudent?: boolean; checkCreator?: boolean } = {}) => 
  requireResourceAccess({ 
    resourceType: 'lesson', 
    allowOwner: options.allowOwner ?? true,
    allowTeacher: options.allowTeacher ?? true,
    allowStudent: options.allowStudent ?? true,
    checkCreator: options.checkCreator ?? true
  });

export const songAccess = (options: { allowOwner?: boolean; allowTeacher?: boolean; allowStudent?: boolean; checkCreator?: boolean } = {}) => 
  requireResourceAccess({ 
    resourceType: 'song', 
    allowOwner: options.allowOwner ?? true,
    allowTeacher: options.allowTeacher ?? true,
    allowStudent: options.allowStudent ?? true,
    checkCreator: options.checkCreator ?? true
  });

export const assignmentAccess = (options: { allowOwner?: boolean; allowTeacher?: boolean; allowStudent?: boolean; checkCreator?: boolean } = {}) => 
  requireResourceAccess({ 
    resourceType: 'assignment', 
    allowOwner: options.allowOwner ?? true,
    allowTeacher: options.allowTeacher ?? true,
    allowStudent: options.allowStudent ?? true,
    checkCreator: options.checkCreator ?? true
  });

export const sessionAccess = (options: { allowOwner?: boolean; allowTeacher?: boolean; allowStudent?: boolean; checkCreator?: boolean } = {}) => 
  requireResourceAccess({ 
    resourceType: 'session', 
    allowOwner: options.allowOwner ?? true,
    allowTeacher: options.allowTeacher ?? true,
    allowStudent: options.allowStudent ?? true,
    checkCreator: options.checkCreator ?? true
  });