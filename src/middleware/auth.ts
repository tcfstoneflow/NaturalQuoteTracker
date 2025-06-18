import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'sales_manager' | 'sales_rep' | 'inventory_specialist' | 'viewer';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const jwtPayloadSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'sales_manager', 'sales_rep', 'inventory_specialist', 'viewer']),
});

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    return jwtPayloadSchema.parse(decoded);
  } catch (error) {
    logger.warn('Invalid JWT token:', error);
    return null;
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.session?.token ||
                req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  return requireRole(['admin'])(req, res, next);
}

export function requireSalesAccess(req: AuthRequest, res: Response, next: NextFunction): void {
  return requireRole(['admin', 'sales_manager', 'sales_rep'])(req, res, next);
}

export function requireInventoryAccess(req: AuthRequest, res: Response, next: NextFunction): void {
  return requireRole(['admin', 'inventory_specialist'])(req, res, next);
}