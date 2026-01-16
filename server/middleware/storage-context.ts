import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage-wrapper';

/**
 * Middleware to set user context in StorageWrapper for real-time event broadcasting
 * This should be used after requireAuth and loadSchoolContext middleware
 */
export const setStorageContext = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      // Clear any existing context if no user
      storage.clearUserContext();
      return next();
    }

    // Set user context for event broadcasting
    const userContext = {
      userId: req.user.id,
      schoolId: req.user.schoolId || (req as any).school?.id,
      role: req.user.role
    };

    storage.setUserContext(userContext);
    
    // Clear context after response is sent
    res.on('finish', () => {
      storage.clearUserContext();
    });

    next();
  } catch (error) {
    console.error('Error setting storage context:', error);
    // Don't fail the request if context setting fails
    next();
  }
};