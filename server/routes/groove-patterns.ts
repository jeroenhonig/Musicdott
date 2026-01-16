/**
 * GrooveScribe Patterns API Routes
 * Handles CRUD operations for drum patterns with GrooveScribe notation
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage-wrapper';
import { insertGroovePatternSchema, type GroovePattern } from '@shared/schema';

const router = Router();

// Input validation schemas
const createPatternSchema = insertGroovePatternSchema.extend({
  tags: z.array(z.string()).optional()
});

const searchParamsSchema = z.object({
  search: z.string().optional().default(''),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'all']).optional().default('all'),
  tags: z.string().optional().transform((val) => val ? val.split(',') : [])
});

// Get all groove patterns (public + user's own)
router.get('/', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userId = req.user?.id;
    const patterns = await storage.getGroovePatterns(userId);
    
    res.json({
      patterns,
      total: patterns.length
    });
  } catch (error) {
    console.error('Failed to fetch groove patterns:', error);
    res.status(500).json({ error: 'Failed to fetch groove patterns' });
  }
});

// Search groove patterns
router.get('/search', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const params = searchParamsSchema.parse(req.query);
    const patterns = await storage.searchGroovePatterns(
      params.search,
      params.difficulty === 'all' ? undefined : params.difficulty,
      params.tags.length > 0 ? params.tags : undefined
    );
    
    res.json({
      patterns,
      total: patterns.length,
      filters: params
    });
  } catch (error) {
    console.error('Failed to search groove patterns:', error);
    res.status(500).json({ error: 'Failed to search groove patterns' });
  }
});

// Get groove pattern statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userId = req.user?.id;
    const patterns = await storage.getGroovePatterns(userId);
    
    const stats = {
      total: patterns.length,
      public: patterns.filter(p => p.isPublic).length,
      private: patterns.filter(p => !p.isPublic && p.createdBy === userId).length,
      byDifficulty: {
        beginner: patterns.filter(p => p.difficulty === 'beginner').length,
        intermediate: patterns.filter(p => p.difficulty === 'intermediate').length,
        advanced: patterns.filter(p => p.difficulty === 'advanced').length
      },
      averageBpm: Math.round(patterns.reduce((sum, p) => sum + (p.bpm || 120), 0) / patterns.length) || 120,
      mostUsedTags: [] as string[] // Could implement tag frequency analysis
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch groove pattern stats:', error);
    res.status(500).json({ error: 'Failed to fetch groove pattern statistics' });
  }
});

// Get specific groove pattern by ID
router.get('/:id', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const pattern = await storage.getGroovePattern(req.params.id);
    
    if (!pattern) {
      return res.status(404).json({ error: 'Groove pattern not found' });
    }
    
    // Check access permissions
    const userId = req.user?.id;
    if (!pattern.isPublic && pattern.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(pattern);
  } catch (error) {
    console.error('Failed to fetch groove pattern:', error);
    res.status(500).json({ error: 'Failed to fetch groove pattern' });
  }
});

// Create new groove pattern
router.post('/', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId?.toString();
    
    const validatedData = createPatternSchema.parse({
      ...req.body,
      createdBy: userId,
      schoolId: schoolId
    });
    
    const pattern = await storage.createGroovePattern(validatedData);
    
    res.status(201).json({
      pattern,
      message: 'Groove pattern created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Failed to create groove pattern:', error);
    res.status(500).json({ error: 'Failed to create groove pattern' });
  }
});

// Update groove pattern
router.put('/:id', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const pattern = await storage.getGroovePattern(req.params.id);
    
    if (!pattern) {
      return res.status(404).json({ error: 'Groove pattern not found' });
    }
    
    // Check ownership
    const userId = req.user?.id;
    if (pattern.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied - not pattern owner' });
    }
    
    const validatedData = createPatternSchema.partial().parse(req.body);
    const updatedPattern = await storage.updateGroovePattern(req.params.id, validatedData);
    
    res.json({
      pattern: updatedPattern,
      message: 'Groove pattern updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Failed to update groove pattern:', error);
    res.status(500).json({ error: 'Failed to update groove pattern' });
  }
});

// Delete groove pattern
router.delete('/:id', async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const pattern = await storage.getGroovePattern(req.params.id);
    
    if (!pattern) {
      return res.status(404).json({ error: 'Groove pattern not found' });
    }
    
    // Check ownership
    const userId = req.user?.id;
    if (pattern.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied - not pattern owner' });
    }
    
    const deleted = await storage.deleteGroovePattern(req.params.id);
    
    if (deleted) {
      res.json({ message: 'Groove pattern deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete groove pattern' });
    }
  } catch (error) {
    console.error('Failed to delete groove pattern:', error);
    res.status(500).json({ error: 'Failed to delete groove pattern' });
  }
});

export default router;