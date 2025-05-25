import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { storage } from './storage';
import { User } from '@shared/schema';

// Authentication configuration
const AUTH_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  PASSWORD_RESET_EXPIRES: 60 * 60 * 1000, // 1 hour
  MFA_CODE_EXPIRES: 10 * 60 * 1000, // 10 minutes
  SESSION_TIMEOUT: 3600, // 1 hour
};

interface AuthRequest extends Request {
  user?: User;
}

// Enhanced password hashing with salt rounds
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Account lockout management
export async function isAccountLocked(user: User): Promise<boolean> {
  if (!user.accountLockedUntil) return false;
  
  if (new Date() > user.accountLockedUntil) {
    // Reset failed attempts if lockout has expired
    await storage.resetFailedLoginAttempts(user.id);
    return false;
  }
  
  return true;
}

export async function incrementFailedAttempts(userId: number): Promise<void> {
  const user = await storage.getUser(userId);
  if (!user) return;

  const attempts = (user.failedLoginAttempts || 0) + 1;
  
  if (attempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + AUTH_CONFIG.LOCKOUT_DURATION);
    await storage.lockAccount(userId, lockUntil);
  } else {
    await storage.updateFailedAttempts(userId, attempts);
  }
}

export async function resetFailedAttempts(userId: number): Promise<void> {
  await storage.resetFailedLoginAttempts(userId);
}

// Password reset functionality
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  const user = await storage.getUserByEmail(email);
  if (!user || !user.isActive) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + AUTH_CONFIG.PASSWORD_RESET_EXPIRES);
  
  await storage.setPasswordResetToken(user.id, token, expires);
  return token;
}

export async function validatePasswordResetToken(token: string): Promise<User | null> {
  const user = await storage.getUserByPasswordResetToken(token);
  if (!user || !user.passwordResetExpires) return null;
  
  if (new Date() > user.passwordResetExpires) {
    await storage.clearPasswordResetToken(user.id);
    return null;
  }
  
  return user;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const user = await validatePasswordResetToken(token);
  if (!user) return false;
  
  const hashedPassword = await hashPassword(newPassword);
  await storage.updatePassword(user.id, hashedPassword);
  await storage.clearPasswordResetToken(user.id);
  await storage.resetFailedLoginAttempts(user.id);
  
  return true;
}

// MFA (Multi-Factor Authentication)
export function generateMFACode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createMFACode(userId: number, type: 'sms' | 'email'): Promise<string> {
  const code = generateMFACode();
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.MFA_CODE_EXPIRES);
  
  await storage.createMFACode({
    userId,
    code,
    type,
    used: false,
    expiresAt,
  });
  
  return code;
}

export async function verifyMFACode(userId: number, code: string, type: 'sms' | 'email'): Promise<boolean> {
  return await storage.verifyAndUseMFACode(userId, code, type);
}

// Email service for notifications
async function getEmailTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email configuration not found. Please configure SMTP settings.');
  }

  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const transporter = await getEmailTransporter();
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Texas Counter Fitters - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You have requested to reset your password for your Texas Counter Fitters account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr style="margin: 24px 0;">
        <p style="color: #666; font-size: 14px;">Texas Counter Fitters CRM System</p>
      </div>
    `,
  };
  
  await transporter.sendMail(mailOptions);
}

export async function sendMFACodeEmail(email: string, code: string): Promise<void> {
  const transporter = await getEmailTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Texas Counter Fitters - Security Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Security Verification Code</h2>
        <p>Your security verification code is:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 4px;">${code}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please contact your administrator immediately.</p>
        <hr style="margin: 24px 0;">
        <p style="color: #666; font-size: 14px;">Texas Counter Fitters CRM System</p>
      </div>
    `,
  };
  
  await transporter.sendMail(mailOptions);
}

// Enhanced login with security features
export async function enhancedLogin(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { username, password, mfaCode } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const user = await storage.getUserByUsername(username);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if account is locked
    if (await isAccountLocked(user)) {
      res.status(423).json({ 
        error: 'Account is temporarily locked due to too many failed attempts',
        lockoutUntil: user.accountLockedUntil 
      });
      return;
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      await incrementFailedAttempts(user.id);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      if (!mfaCode) {
        // Generate and send MFA code
        const code = await createMFACode(user.id, 'email');
        await sendMFACodeEmail(user.email, code);
        
        res.status(200).json({ 
          requiresMFA: true,
          message: 'Security code sent to your email' 
        });
        return;
      }
      
      // Verify MFA code
      const isValidMFA = await verifyMFACode(user.id, mfaCode, 'email');
      if (!isValidMFA) {
        res.status(401).json({ error: 'Invalid security code' });
        return;
      }
    }

    // Successful login
    await resetFailedAttempts(user.id);
    await storage.updateUserLastLogin(user.id);
    
    // Set up session
    req.session.userId = user.id;
    req.session.maxAge = (user.sessionTimeout || AUTH_CONFIG.SESSION_TIMEOUT) * 1000;
    
    res.json({ 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      message: 'Login successful' 
    });
  } catch (error) {
    console.error('Enhanced login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Session timeout middleware
export function sessionTimeoutMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.session && req.session.userId) {
    const now = Date.now();
    const lastActivity = req.session.lastActivity || req.session.cookie.originalMaxAge;
    
    if (now - lastActivity > (req.session.maxAge || AUTH_CONFIG.SESSION_TIMEOUT * 1000)) {
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    
    req.session.lastActivity = now;
  }
  
  next();
}

// Enhanced authentication middleware
export async function enhancedAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.session?.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isActive) {
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Enhanced auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}