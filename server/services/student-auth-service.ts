import { DatabaseStorage } from "../database-storage";
import { Student } from "@shared/schema";
import bcrypt from "bcrypt";

export interface StudentAuthResult {
  success: boolean;
  student?: Student;
  error?: string;
}

export class StudentAuthService {
  private storage: DatabaseStorage;
  private authCache: Map<string, { student: Student; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    
    // Clean expired cache entries every minute
    setInterval(() => {
      this.cleanExpiredCache();
    }, 60000);
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.authCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.authCache.delete(key);
      }
    }
  }

  private getCacheKey(username: string): string {
    return `student:${username}`;
  }

  async authenticateStudent(username: string, password: string): Promise<StudentAuthResult> {
    try {
      // Check cache first for recently authenticated students
      const cacheKey = this.getCacheKey(username);
      const cached = this.authCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < this.CACHE_DURATION)) {
        // Still need to verify password for security
        const passwordMatch = await bcrypt.compare(password, cached.student.password || '');
        if (passwordMatch) {
          return { success: true, student: cached.student };
        }
      }

      // Get student from database
      const student = await this.storage.getStudentByUsername(username);
      
      if (!student) {
        return { success: false, error: "Student not found" };
      }

      if (!student.password) {
        return { success: false, error: "Student account not activated" };
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, student.password);
      
      if (!passwordMatch) {
        return { success: false, error: "Invalid password" };
      }

      // Cache successful authentication
      this.authCache.set(cacheKey, {
        student,
        timestamp: Date.now()
      });

      return { success: true, student };
      
    } catch (error) {
      console.error("Student authentication error:", error);
      return { success: false, error: "Authentication failed" };
    }
  }

  async updateStudentLastLogin(studentId: number): Promise<void> {
    try {
      await this.storage.updateStudent(studentId, {
        lastLoginAt: new Date()
      });
    } catch (error) {
      console.error("Failed to update student last login:", error);
    }
  }

  async getActiveStudentSessions(): Promise<number> {
    return this.authCache.size;
  }

  async clearStudentFromCache(username: string): Promise<void> {
    const cacheKey = this.getCacheKey(username);
    this.authCache.delete(cacheKey);
  }
}