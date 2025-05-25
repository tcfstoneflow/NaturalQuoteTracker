import { createClerkClient } from '@clerk/backend';
import type { Request, Response, NextFunction } from 'express';

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Helper to verify Clerk JWT token
export async function verifyClerkToken(token: string) {
  try {
    // Use Clerk's verifySession for JWT verification
    const decoded = await clerkClient.verifySession(token);
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Middleware to extract and verify Clerk token
export async function clerkAuthMiddleware(req: any, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyClerkToken(token);
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.clerkUserId = decoded.sub;
    next();
  } catch (error) {
    console.error('Clerk auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Helper to get user from Clerk
export async function getClerkUser(userId: string) {
  try {
    const user = await clerkClient.users.getUser(userId);
    return {
      id: user.id,
      username: user.username || user.emailAddresses[0]?.emailAddress || '',
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.publicMetadata?.role as string || 'sales_rep',
      isActive: true
    };
  } catch (error) {
    console.error('Error fetching Clerk user:', error);
    return null;
  }
}

// Middleware to require authentication
export function requireClerkAuth(req: any, res: Response, next: NextFunction) {
  if (!req.clerkUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Middleware to require specific roles
export function requireRole(roles: string[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.clerkUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const user = await getClerkUser(req.clerkUserId);
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