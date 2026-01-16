import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, School, SchoolMembership, USER_ROLES } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Centralized list of all user-scoped query keys
// This ensures login/logout handle the same set of queries systematically
const USER_SCOPED_QUERY_KEYS = [
  "/api/schools/memberships",
  "/api/students",
  "/api/lessons",
  "/api/songs",
  "/api/dashboard/stats",
  "/api/messages",
  "/api/assignments",
  "/api/practice-sessions",
  "/api/achievements",
  "/api/notifications",
  "/api/user/preferences",
] as const;

type SchoolWithMembership = School & {
  membership: SchoolMembership;
};

type AuthContextType = {
  user: Omit<SelectUser, "password"> | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Omit<SelectUser, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<SelectUser, "password">, Error, RegisterData>;
  changePasswordMutation: UseMutationResult<{message: string}, Error, ChangePasswordData>;
  // School context
  schools: SchoolWithMembership[];
  currentSchool: SchoolWithMembership | null;
  switchSchool: (schoolId: number) => void;
  schoolsLoading: boolean;
  // Role checking functions
  isPlatformOwner: () => boolean;
  isSchoolOwner: (schoolId?: number) => boolean;
  isTeacher: (schoolId?: number) => boolean;
  isStudent: () => boolean;
  canManageSchool: (schoolId?: number) => boolean;
  canAccessSchool: (schoolId?: number) => boolean;
  hasRole: (role: string, schoolId?: number) => boolean;
};

type LoginData = Pick<SelectUser, "username" | "password">;

type ChangePasswordData = {
  currentPassword: string;
  newPassword: string;
};

const registerSchema = insertUserSchema.extend({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["platform_owner", "school_owner", "teacher", "student"]).default("teacher"),
});

type RegisterData = z.infer<typeof registerSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [currentSchoolId, setCurrentSchoolId] = useState<number | null>(null);
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<Omit<SelectUser, "password"> | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch user's school memberships
  const {
    data: schoolsData,
    isLoading: schoolsLoading,
  } = useQuery<SchoolWithMembership[]>({
    queryKey: ["/api/schools/memberships"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const schools = schoolsData ?? [];

  // Set initial school if not set using useEffect to avoid render anti-pattern
  useEffect(() => {
    if (!currentSchoolId && schools.length > 0) {
      setCurrentSchoolId(schools[0].id);
    }
  }, [schools, currentSchoolId]);

  const currentSchool = (schools ?? []).find(s => s.id === currentSchoolId) || (schools ?? [])[0] || null;

  // School switching function
  const switchSchool = (schoolId: number) => {
    setCurrentSchoolId(schoolId);
    // Invalidate relevant queries when switching schools
    queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
    queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    
    toast({
      title: "School switched",
      description: `Switched to ${(schools ?? []).find(s => s.id === schoolId)?.name}`,
    });
  };

  // Role checking functions
  const isPlatformOwner = (): boolean => {
    return user?.role === USER_ROLES.PLATFORM_OWNER;
  };

  const isSchoolOwner = (schoolId?: number): boolean => {
    if (user?.role === USER_ROLES.PLATFORM_OWNER) return true;
    if (user?.role === USER_ROLES.SCHOOL_OWNER) return true;
    
    const targetSchoolId = schoolId || currentSchoolId;
    if (!targetSchoolId) return false;
    
    const school = (schools ?? []).find(s => s.id === targetSchoolId);
    return school?.membership?.role === 'owner';
  };

  const isTeacher = (schoolId?: number): boolean => {
    if (user?.role === USER_ROLES.PLATFORM_OWNER) return true;
    if (user?.role === USER_ROLES.SCHOOL_OWNER) return true;
    if (user?.role === USER_ROLES.TEACHER) return true;
    
    const targetSchoolId = schoolId || currentSchoolId;
    if (!targetSchoolId) return false;
    
    const school = (schools ?? []).find(s => s.id === targetSchoolId);
    return school?.membership?.role === 'teacher' || school?.membership?.role === 'owner';
  };

  const isStudent = (): boolean => {
    return user?.role === USER_ROLES.STUDENT;
  };

  const canManageSchool = (schoolId?: number): boolean => {
    return isPlatformOwner() || isSchoolOwner(schoolId);
  };

  const canAccessSchool = (schoolId?: number): boolean => {
    if (isPlatformOwner()) return true;
    
    const targetSchoolId = schoolId || currentSchoolId;
    if (!targetSchoolId) return false;
    
    return (schools ?? []).some(s => s.id === targetSchoolId);
  };

  const hasRole = (role: string, schoolId?: number): boolean => {
    const targetSchoolId = schoolId || currentSchoolId;
    
    switch (role) {
      case 'platform_owner':
        return isPlatformOwner();
      case 'school_owner':
        return isSchoolOwner(targetSchoolId || undefined);
      case 'teacher':
        return isTeacher(targetSchoolId || undefined);
      case 'student':
        return isStudent();
      default:
        return false;
    }
  };

  const loginMutation = useMutation<Omit<SelectUser, "password">, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      console.log("🔐 [LOGIN MUTATION] Starting login with:", { username: credentials.username });
      try {
        console.log("📤 [LOGIN MUTATION] Sending POST request to /api/login");
        const res = await apiRequest("POST", "/api/login", credentials);
        console.log("📥 [LOGIN MUTATION] Response received, status:", res.status);
        
        const userData = await res.json();
        console.log("✅ [LOGIN MUTATION] Login successful, user data:", userData);
        
        // Immediately verify authentication state after login
        setTimeout(async () => {
          try {
            console.log('🔍 [LOGIN MUTATION] Verifying authentication state post-login...');
            const verifyRes = await fetch('/api/user', { 
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });
            if (verifyRes.ok) {
              console.log('✅ [LOGIN MUTATION] Authentication verification successful');
            } else {
              console.error('❌ [LOGIN MUTATION] Authentication verification failed:', verifyRes.status);
            }
          } catch (verifyError) {
            console.error('❌ [LOGIN MUTATION] Authentication verification error:', verifyError);
          }
        }, 100);
        
        return userData;
      } catch (error) {
        console.error("❌ [LOGIN MUTATION] Login failed with error:", error);
        console.error("❌ [LOGIN MUTATION] Error type:", error instanceof Error ? error.constructor.name : typeof error);
        console.error("❌ [LOGIN MUTATION] Error message:", error instanceof Error ? error.message : String(error));
        throw error;
      }
    },
    onSuccess: (user) => {
      console.log("🎯 [LOGIN] Login mutation onSuccess triggered with user:", user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidate all user-scoped queries using centralized list
      USER_SCOPED_QUERY_KEYS.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      
      console.log("✅ [LOGIN] User data set and all user-scoped queries invalidated");
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      console.error("🚨 Login mutation onError triggered:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<Omit<SelectUser, "password">, Error, RegisterData>({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to MusicDott, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Reset auth state
      queryClient.setQueryData(["/api/user"], null);
      setCurrentSchoolId(null);
      
      // Remove only user-scoped queries using centralized list
      // This preserves global/public caches while preventing stale user data
      USER_SCOPED_QUERY_KEYS.forEach(queryKey => {
        queryClient.removeQueries({ queryKey: [queryKey] });
      });
      
      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation<{message: string}, Error, ChangePasswordData>({
    mutationFn: async (passwordData: ChangePasswordData) => {
      const res = await apiRequest("PATCH", "/api/user/password", passwordData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        changePasswordMutation,
        // School context
        schools,
        currentSchool,
        switchSchool,
        schoolsLoading,
        // Role checking functions
        isPlatformOwner,
        isSchoolOwner,
        isTeacher,
        isStudent,
        canManageSchool,
        canAccessSchool,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
