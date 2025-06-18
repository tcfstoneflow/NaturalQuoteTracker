import { describe, it, expect, beforeEach } from 'vitest';
import { generateToken, verifyToken } from '../../src/middleware/auth.js';
import { AuthUser } from '../../src/middleware/auth.js';

describe('Authentication Middleware', () => {
  const mockUser: AuthUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'admin'
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.id).toBe(mockUser.id);
      expect(decoded?.username).toBe(mockUser.username);
      expect(decoded?.email).toBe(mockUser.email);
      expect(decoded?.role).toBe(mockUser.role);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.string';
      const decoded = verifyToken(invalidToken);
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';
      const decoded = verifyToken(malformedToken);
      expect(decoded).toBeNull();
    });
  });
});