import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, RequestHandler } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage-wrapper";
import { User as SelectUser } from "@shared/schema";
import {
  passwordChangeRequestSchema,
  registerUserSchema,
} from "@shared/auth-validation";
import { z } from "zod";
import { EmailNotificationService } from "./services/email-notifications";
import { authRateLimit, passwordChangeRateLimit, verifySameOrigin } from "./middleware/security";

// Exported session middleware for Socket.IO integration
export let sessionMiddleware: RequestHandler;

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

export async function comparePasswords(supplied: string, stored: string) {
  // Handle bcrypt passwords (starting with $2a$, $2b$, or $2y$)
  if (/^\$2[aby]\$/.test(stored)) {
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

function getSessionMaxAgeMs(): number {
  const rawValue = process.env.SESSION_MAX_AGE_HOURS;
  // Default: 8 hours. Override via SESSION_MAX_AGE_HOURS env var.
  const parsedHours = rawValue ? Number.parseInt(rawValue, 10) : 8;
  const safeHours = Number.isFinite(parsedHours) && parsedHours > 0 ? parsedHours : 8;
  return safeHours * 60 * 60 * 1000;
}

function getTrustProxySetting(): boolean | number | string {
  const rawValue = process.env.TRUST_PROXY;
  if (!rawValue || rawValue.trim().length === 0) {
    return 1;
  }

  const normalizedValue = rawValue.trim().toLowerCase();
  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  const parsedNumber = Number.parseInt(rawValue, 10);
  if (Number.isFinite(parsedNumber)) {
    return parsedNumber;
  }

  return rawValue;
}

export async function changeAuthenticatedUserPassword(
  user: Pick<SelectUser, "id" | "password">,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!user.id) {
    throw new Error("User not found");
  }

  const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  const hashedNewPassword = await hashPassword(newPassword);
  await storage.updateUser(user.id, {
    password: hashedNewPassword,
    mustChangePassword: false,
  });
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
      maxAge: getSessionMaxAgeMs(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === 'production',
      domain: undefined,
      path: '/'
    }
  };

  app.set("trust proxy", getTrustProxySetting());

  sessionMiddleware = session(sessionSettings);
  app.use(sessionMiddleware);
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Production session monitoring (minimal logging)
  app.use((req, res, next) => {
    const skippedPaths = new Set([
      '/api/login',
      '/api/auth/login',
      '/api/register',
      '/api/owner/login',
      '/api/logout',
      '/api/user/password',
    ]);

    // Only log authentication failures in production for security monitoring
    if (
      req.path.startsWith('/api/') &&
      !req.isAuthenticated?.() &&
      req.method !== 'GET' &&
      !skippedPaths.has(req.path)
    ) {
      console.warn(`🔒 Auth required: ${req.method} ${req.path} from ${req.ip}`);
    }
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsernameForAuth(username);
        if (!user) {
          return done(null, false);
        }

        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          return done(null, false);
        }

        try {
          await storage.updateUser(user.id!, { lastLoginAt: new Date() });
        } catch (error) {
          console.warn('Failed to update last login time', error);
        }

        return done(null, user);
      } catch (error) {
        console.error('Error during authentication', error);
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

  app.post("/api/register", verifySameOrigin, authRateLimit, async (req, res, next) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
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
      
      // Teacher/student school assignment via invite codes is handled by admins
      // after registration. No hardcoded codes are accepted.

      const {
        username,
        password,
        name,
        email,
        role,
        bio,
        instruments,
      } = validatedData;

      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        name,
        email,
        role,
        bio,
        instruments,
        schoolId,
      });

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
      const { password: _password, ...userWithoutPassword } = user;

      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
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

  app.post("/api/login", verifySameOrigin, authRateLimit, (req, res, next) => {
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
  app.post("/api/auth/login", verifySameOrigin, authRateLimit, (req, res, next) => {
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

  app.post("/api/logout", verifySameOrigin, (req, res, next) => {
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

  app.patch("/api/user/password", verifySameOrigin, passwordChangeRateLimit, async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { currentPassword, newPassword } = passwordChangeRequestSchema.parse(req.body);
      await changeAuthenticatedUserPassword(req.user!, currentPassword, newPassword);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid password change data", 
          errors: error.errors 
        });
      }

      if (error instanceof Error && error.message === "Current password is incorrect") {
        return res.status(400).json({ message: error.message });
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
  const user = req.user;
  const allowedPathSuffixes = [
    '/user',
    '/user/password', 
    '/logout',
    '/auth/login',
    '/login',
    '/register',
    '/owner/login',
  ];
  const requestPath = req.originalUrl || req.path || '';
  const isAllowedPath = allowedPathSuffixes.some((allowedPath) => requestPath.endsWith(allowedPath));

  if (isAllowedPath) {
    return next();
  }

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // If user must change password and this is not an allowed endpoint, block access
  if (user.mustChangePassword) {
    return res.status(403).json({ 
      message: "Password change required", 
      mustChangePassword: true,
      redirectTo: "/change-password"
    });
  }
  
  next();
}
