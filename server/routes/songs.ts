import { Express, Request, Response } from "express";
import { storage } from "../storage-wrapper";
import { insertSongSchema } from "@shared/schema";
import { z } from "zod";
import { 
  loadSchoolContext, 
  requireTeacherOrOwner
} from "../middleware/authz";
import { requireAuth } from "../auth";

// Middleware to verify song access
function requireSongAccess(songIdParam: string = 'id') {
  return async (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.school) {
      return res.status(500).json({ message: "School context not loaded" });
    }

    const songId = parseInt(req.params[songIdParam]);
    if (Number.isNaN(songId)) {
      return next('route');
    }

    const song = await storage.getSong(songId);

    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    if (req.school.isPlatformOwner()) {
      return next();
    }

    if (song.schoolId && !req.school.canAccessSchool(song.schoolId)) {
      return res.status(403).json({ message: "You don't have access to this song" });
    }

    if (song.schoolId && req.school.isStudent(song.schoolId)) {
      return res.status(403).json({ message: "You don't have access to this song" });
    }

    if (song.userId === req.user.id) {
      return next();
    }

    if (song.schoolId && (req.school.isSchoolOwner(song.schoolId) || req.school.isTeacher(song.schoolId))) {
      return next();
    }

    return res.status(403).json({ message: "You don't have access to this song" });
  };
}

export function registerSongRoutes(app: Express) {
  // Get all songs - role-based access with school scoping
  app.get(
    "/api/songs",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
      try {
        let songs;
        const schoolId = req.school?.id || req.user!.schoolId;

        // Platform owners see all songs
        if (req.school?.isPlatformOwner()) {
          songs = await storage.getSongs(req.user!.id);
        }
        // School owners see ALL songs in their school
        else if (req.school?.isSchoolOwner() && schoolId) {
          songs = await storage.getSongsBySchool(schoolId);
        }
        // Teachers see only their own songs
        else if (req.school?.isTeacher()) {
          songs = await storage.getSongs(req.user!.id);
        }
        else {
          return res.status(403).json({
            message: "Insufficient permissions to view songs",
            role: req.school?.role
          });
        }

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
    requireAuth,
    loadSchoolContext,
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
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "Not authenticated" });
        }

        const schoolId = req.school?.id || req.user.schoolId;
        if (!schoolId) {
          return res.status(400).json({ message: "No school context available" });
        }
        
        // Parse the request body without userId/schoolId (they're omitted from schema)
        const parsedBody = insertSongSchema.parse(req.body);
        
        // Add user and school context after validation
        const validatedData = {
          ...parsedBody,
          userId: req.user.id,
          schoolId
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
    requireAuth,
    loadSchoolContext,
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
    requireAuth,
    loadSchoolContext,
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
