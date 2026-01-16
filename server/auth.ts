import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage-wrapper";
import { User as SelectUser } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { EmailNotificationService } from "./services/email-notifications";
import { authRateLimit } from "./middleware/security";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Handle bcrypt passwords (starting with $2a$ or $2b$)
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
    const bcrypt = await import('bcrypt');
    try {
      return await bcrypt.compare(supplied, stored);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error comparing bcrypt password:', error);
      }
      return false;
    }
  }
  
  // Handle our custom scrypt passwords
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Invalid password format in database, missing dot separator');
      }
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error comparing passwords:', error);
    }
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;

  // Validate session secret is set
  if (!sessionSecret) {
    throw new Error(
      '❌ CRITICAL: SESSION_SECRET environment variable is not set!\n' +
      'Generate one with: openssl rand -base64 32\n' +
      'Add it to your .env file'
    );
  }

  // Validate session secret strength
  if (sessionSecret.length < 32) {
    throw new Error(
      '❌ CRITICAL: SESSION_SECRET must be at least 32 characters long!\n' +
      'Current length: ' + sessionSecret.length + '\n' +
      'Generate a new one with: openssl rand -base64 32'
    );
  }
  
  const sessionSettings: session.SessionOptions = {
    name: 'musicdott.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days for better persistence
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? "strict" : "lax", // Lax for development
      secure: process.env.NODE_ENV === 'production', // Auto-secure for production
      domain: undefined, // Let browser set domain automatically
      path: '/' // Ensure cookies work across all paths
    }
  };

  // Set trust proxy for Replit environment (always needed)
  app.set("trust proxy", 1);
  
  // Initialize session with error handling
  try {
    app.use(session(sessionSettings));
    console.log('✅ Session middleware initialized successfully');
  } catch (error) {
    console.error('❌ Session middleware initialization failed:', error);
    throw error;
  }
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Production session monitoring (minimal logging)
  app.use((req, res, next) => {
    // Only log authentication failures in production for security monitoring
    if (req.path.startsWith('/api/') && !req.isAuthenticated?.() && req.method !== 'GET') {
      console.warn(`🔒 Auth required: ${req.method} ${req.path} from ${req.ip}`);
    }
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('🔐 Attempting login for username:', username);
        const user = await storage.getUserByUsernameForAuth(username);
        
        if (!user) {
          console.log('❌ User not found:', username);
          return done(null, false);
        }
        
        console.log('✅ User found:', user.id, user.username);
        
        const passwordMatch = await comparePasswords(password, user.password);
        console.log('🔒 Password match result:', passwordMatch);
        
        if (!passwordMatch) {
          console.log('❌ Password mismatch for user:', username);
          return done(null, false);
        } else {
          console.log('✅ Authentication successful for user:', user.id);
          // Update last login time
          try {
            await storage.updateUser(user.id!, { lastLoginAt: new Date() });
          } catch (error) {
            console.warn('Failed to update last login time:', error);
          }
          return done(null, user);
        }
      } catch (error) {
        console.error('💥 Error during authentication:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        done(null, user);
      } else {
        done(null, false);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error deserializing user:', error);
      }
      done(null, false);
    }
  });

  // Extended user schema with validation for registration
  const registerUserSchema = insertUserSchema.extend({
    username: z.string().min(3).max(50),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    name: z.string().min(2).max(100),
    email: z.string().email(),
    role: z.enum(["admin", "school_owner", "teacher", "student"]).default("teacher"),
    // School related fields
    schoolName: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    website: z.string().optional(),
    phone: z.string().optional(),
    description: z.string().optional(),
    // Extended user fields
    bio: z.string().optional(),
    instruments: z.string().optional(),
    // Student fields
    studentCode: z.string().optional(),
    // Teacher fields
    schoolCode: z.string().optional(),
  });
  
  type RegisterUserData = z.infer<typeof registerUserSchema>;

  app.post("/api/register", async (req, res, next) => {
    console.log("🔥 REGISTRATION ATTEMPT:", JSON.stringify(req.body, null, 2));
    try {
      const validatedData: RegisterUserData = registerUserSchema.parse(req.body);
      console.log("✅ REGISTRATION DATA VALIDATED:", validatedData.username);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Handle different role registrations
      let schoolId = null;
      
      // If registering as a school owner, create school first
      if (validatedData.role === "school_owner" && validatedData.schoolName) {
        try {
          // In a production app, we would do this in a transaction
          const school = await storage.createSchool({
            name: validatedData.schoolName,
            address: validatedData.address,
            city: validatedData.city,
            website: validatedData.website,
            phone: validatedData.phone,
            instruments: validatedData.instruments,
            description: validatedData.description,
          });
          schoolId = school.id;
        } catch (error) {
          console.error("Failed to create school:", error);
          // Continue with user creation even if school creation fails
        }
      }
      
      // If registering as a teacher, validate school code
      else if (validatedData.role === "teacher" && validatedData.schoolCode) {
        try {
          // In a real app, we would validate the school code against our database
          // For now, let's just hardcode a validation
          // This would be replaced with a proper lookup of invite codes
          if (validatedData.schoolCode === "DEMO123") {
            schoolId = 1; // Dummy school ID
          }
        } catch (error) {
          console.error("Failed to validate school code:", error);
        }
      }
      
      // If registering as a student, validate student code
      else if (validatedData.role === "student" && validatedData.studentCode) {
        try {
          // In a real app, we would validate the student code against our database
          // and link to an existing student record
          // For now, let's just hardcode a validation
          if (validatedData.studentCode === "STUDENT123") {
            schoolId = 1; // Dummy school ID
          }
        } catch (error) {
          console.error("Failed to validate student code:", error);
        }
      }

      console.log("🚀 CREATING USER:", validatedData.username);
      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password),
        schoolId,
      });
      console.log("✅ USER CREATED SUCCESSFULLY:", user.id, user.username);

      // Send email notifications for new registrations
      try {
        if (validatedData.role === "school_owner") {
          await EmailNotificationService.notifySchoolWelcome({
            schoolName: validatedData.schoolName || validatedData.name,
            ownerName: validatedData.name,
            email: validatedData.email,
            username: validatedData.username
          });
        } else if (validatedData.role === "teacher") {
          await EmailNotificationService.notifyNewTeacherSubscription({
            name: validatedData.name,
            username: validatedData.username,
            email: validatedData.email,
            instruments: validatedData.instruments
          });
        }
      } catch (emailError) {
        console.error("Failed to send registration notification email:", emailError);
        // Continue with registration even if email fails
      }

      // Don't return the password
      const { password, ...userWithoutPassword } = user;

      console.log("🔑 LOGGING USER IN:", user.username);
      req.login(user, (err) => {
        if (err) {
          console.error("❌ LOGIN ERROR:", err);
          return next(err);
        }
        console.log("✅ REGISTRATION COMPLETE, SENDING RESPONSE");
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  app.post("/api/login", authRateLimit, (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      req.login(user, (err: Error | null) => {
        if (err) return next(err);
        
        // Don't return the password
        const { password, ...userWithoutPassword } = user;
        
        // Include password change requirement in response
        const loginResponse = {
          ...userWithoutPassword,
          mustChangePassword: user.mustChangePassword || false
        };
        
        res.json(loginResponse);
      });
    })(req, res, next);
  });

  // Auth login endpoint for compatibility
  app.post("/api/auth/login", authRateLimit, (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      req.login(user, (err: Error | null) => {
        if (err) return next(err);
        
        // Don't return the password
        const { password, ...userWithoutPassword } = user;
        
        // Include password change requirement in response
        const loginResponse = {
          ...userWithoutPassword,
          mustChangePassword: user.mustChangePassword || false
        };
        
        res.json(loginResponse);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Don't return the password
    const { password, ...userWithoutPassword } = req.user!;
    
    // Include password change requirement in response
    const userResponse = {
      ...userWithoutPassword,
      mustChangePassword: req.user!.mustChangePassword || false
    };
    
    res.json(userResponse);
  });

  // Password change endpoint with strong validation matching frontend
  const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
  });

  app.patch("/api/user/password", authRateLimit, async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body);
      const user = req.user!;

      // Verify current password
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password and clear mustChangePassword flag
      await storage.updateUser(user.id!, {
        password: hashedNewPassword,
        mustChangePassword: false
      });

      console.log(`Password changed for user ${user.id} (${user.username})`);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid password change data", 
          errors: error.errors 
        });
      }
      console.error('Password change error:', error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
}

// Production authentication middleware
export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    // Log failed authentication attempts for security monitoring
    console.warn(`🔒 Authentication failed: ${req.method} ${req.path} from ${req.ip}`);
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

// Middleware to enforce password change requirement
export function enforcePasswordChange(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user;
  const allowedPaths = [
    '/api/user',
    '/api/user/password', 
    '/api/logout',
    '/api/auth/login',
    '/api/login'
  ];
  
  // If user must change password and this is not an allowed endpoint, block access
  if (user.mustChangePassword && !allowedPaths.includes(req.path)) {
    return res.status(403).json({ 
      message: "Password change required", 
      mustChangePassword: true,
      redirectTo: "/change-password"
    });
  }
  
  next();
}
