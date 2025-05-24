import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { loginSchema, insertUserSchema } from '@shared/schema';

// Extend Express Request type to include user session
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
  }
}

// Authentication middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Role-based authorization middleware
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Special middleware for inventory operations (allows inventory_specialist + admin)
export function requireInventoryAccess() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!['admin', 'inventory_specialist'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient inventory permissions' });
    }

    next();
  };
}

// Middleware for pricing operations (admin only)
export function requirePricingAccess() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can modify pricing' });
    }

    next();
  };
}

// Hash password helper
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password helper
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Login function
export async function login(req: Request, res: Response) {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await storage.getUserByUsername(username);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await storage.updateUserLastLogin(user.id);

    // Set session
    req.session.userId = user.id;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message || 'Login failed' });
  }
}

// Register function (admin only)
export async function register(req: Request, res: Response) {
  try {
    // Validate basic required fields without strict schema
    const { username, email, firstName, lastName, password, role = 'sales_rep', isActive = true } = req.body;
    
    if (!username || !email || !firstName || !lastName || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user data for database
    const userDataForDB = {
      username,
      email,
      firstName,
      lastName,
      role,
      isActive,
      passwordHash,
    };

    const newUser = await storage.createUser(userDataForDB);

    res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
}

// Logout function
export async function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
}

// Get current user
export async function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({ user: req.user });
}