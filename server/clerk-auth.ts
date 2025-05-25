import { clerkMiddleware, createClerkClient } from '@clerk/backend';
import type { Request, Response, NextFunction } from 'express';

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Clerk middleware for Express
export const clerkAuth = clerkMiddleware();

// Helper to get user from Clerk
export async function getClerkUser(req: any) {
  if (!req.auth?.userId) {
    return null;
  }

  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    return {
      id: user.id,
      username: user.username || user.emailAddresses[0]?.emailAddress || '',
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.publicMetadata?.role as string || 'sales',
      isActive: true
    };
  } catch (error) {
    console.error('Error fetching Clerk user:', error);
    return null;
  }
}

// Middleware to require authentication
export function requireClerkAuth(req: any, res: Response, next: NextFunction) {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Middleware to require specific roles
export function requireRole(roles: string[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.auth?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const user = await getClerkUser(req);
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  };
}