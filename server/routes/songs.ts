import { Express, Request, Response } from "express";
import { storage } from "../storage-wrapper";
import { USER_ROLES } from "@shared/schema";
import { insertSongSchema } from "@shared/schema";
import { z } from "zod";
import { 
  loadSchoolContext, 
  requireTeacherOrOwner, 
  applySchoolFiltering 
} from "../middleware/authz";
import { requireAuth } from "../auth";

// Helper function to check if the user has access to a song
function hasSongAccess(req: Request, songId: number): boolean {
  if (!req.isAuthenticated() || !req.user) return false;
  
  // Platform owner has access to all songs
  if (req.user.role === USER_ROLES.PLATFORM_OWNER) return true;
  
  // For other users, we'll need to check the song's owner
  // This requires async operation, handled in the middleware
  return true;
}

// Middleware to verify song access
function requireSongAccess(songIdParam: string = 'id') {
  return async (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const songId = parseInt(req.params[songIdParam]);
    const song = await storage.getSong(songId);
    
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }
    
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Platform owner has access to all songs
    if (req.user.role === USER_ROLES.PLATFORM_OWNER) {
      return next();
    }
    
    // Creator has access to their songs
    if (song.userId === req.user.id) {
      return next();
    }
    
    // School owner has access to songs created by teachers in their school
    if (req.user.role === USER_ROLES.SCHOOL_OWNER && song.userId) {
      const songCreator = await storage.getUser(song.userId);
      if (songCreator && songCreator.schoolId === req.user.schoolId) {
        return next();
      }
    }
    
    // Teachers can access songs from other teachers in their school
    if (req.user.role === USER_ROLES.TEACHER && song.userId) {
      const songCreator = await storage.getUser(song.userId);
      if (songCreator && songCreator.schoolId === req.user.schoolId) {
        return next();
      }
    }
    
    return res.status(403).json({ message: "You don't have access to this song" });
  };
}

// Authorization middleware for role-based access
function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized role" });
    }
    
    next();
  };
}

export function registerSongRoutes(app: Express) {
  // Get all songs - SIMPLIFIED role-based access
  app.get(
    "/api/songs", 
    requireAuth,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
      try {
        // SIMPLIFIED: Just get songs for the authenticated user
        const songs = await storage.getSongs(req.user!.id);
        console.log(`Songs retrieved for user ${req.user!.id} (${req.user!.role}):`, songs.length);
        res.json(songs);
      } catch (error) {
        console.error("Error getting songs:", error);
        res.status(500).json({ message: "Failed to fetch songs" });
      }
    }
  );
  
  // Get a specific song
  app.get(
    "/api/songs/:id", 
    requireRole([USER_ROLES.PLATFORM_OWNER, USER_ROLES.SCHOOL_OWNER, USER_ROLES.TEACHER, USER_ROLES.STUDENT]),
    requireSongAccess(),
    async (req: Request, res: Response) => {
      try {
        const songId = parseInt(req.params.id);
        const song = await storage.getSong(songId);
        
        if (!song) {
          return res.status(404).json({ message: "Song not found" });
        }
        
        res.json(song);
      } catch (error) {
        console.error("Error getting song:", error);
        res.status(500).json({ message: "Failed to get song" });
      }
    }
  );
  
  // Create a new song
  app.post(
    "/api/songs",
    requireRole([USER_ROLES.PLATFORM_OWNER, USER_ROLES.SCHOOL_OWNER, USER_ROLES.TEACHER]),
    async (req: Request, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "Not authenticated" });
        }
        
        // Parse the request body without userId/schoolId (they're omitted from schema)
        const parsedBody = insertSongSchema.parse(req.body);
        
        // Add user and school context after validation
        const validatedData = {
          ...parsedBody,
          userId: req.user.id,
          schoolId: req.user.schoolId
        };
        
        const song = await storage.createSong(validatedData);
        res.status(201).json(song);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid song data", 
            errors: error.errors 
          });
        }
        console.error("Error creating song:", error);
        res.status(500).json({ message: "Failed to create song" });
      }
    }
  );
  
  // Update a song
  app.put(
    "/api/songs/:id",
    requireRole([USER_ROLES.PLATFORM_OWNER, USER_ROLES.SCHOOL_OWNER, USER_ROLES.TEACHER]),
    requireSongAccess(),
    async (req: Request, res: Response) => {
      try {
        const songId = parseInt(req.params.id);
        
        // Use partial schema validation for updates
        const updateSongSchema = insertSongSchema.partial();
        const validatedData = updateSongSchema.parse(req.body);
        
        const updatedSong = await storage.updateSong(songId, validatedData);
        
        if (!updatedSong) {
          return res.status(404).json({ message: "Song not found" });
        }
        
        res.json(updatedSong);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid song data", 
            errors: error.errors 
          });
        }
        console.error("Error updating song:", error);
        res.status(500).json({ message: "Failed to update song" });
      }
    }
  );
  
  // Delete a song
  app.delete(
    "/api/songs/:id",
    requireRole([USER_ROLES.PLATFORM_OWNER, USER_ROLES.SCHOOL_OWNER, USER_ROLES.TEACHER]),
    requireSongAccess(),
    async (req: Request, res: Response) => {
      try {
        const songId = parseInt(req.params.id);
        
        const success = await storage.deleteSong(songId);
        
        if (!success) {
          return res.status(404).json({ message: "Song not found" });
        }
        
        res.status(200).json({ message: "Song deleted successfully" });
      } catch (error) {
        console.error("Error deleting song:", error);
        res.status(500).json({ message: "Failed to delete song" });
      }
    }
  );
}