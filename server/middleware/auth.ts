/**
 * Authentication middleware for AI services
 */

import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    if ((req.user as any).role !== role) {
      return res.status(403).json({ error: `${role} access required` });
    }
    
    next();
  };
}

export function requireTeacher(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const userRole = (req.user as any).role;
  if (!['teacher', 'school_owner', 'platform_owner'].includes(userRole)) {
    return res.status(403).json({ error: "Teacher access required" });
  }
  
  next();
}