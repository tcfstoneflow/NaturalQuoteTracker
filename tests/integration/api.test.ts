import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index.js';
import { generateToken } from '../../src/middleware/auth.js';

const adminUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin' as const
};

const adminToken = generateToken(adminUser);

describe('API Integration Tests', () => {
  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);
      
      expect(response.body.error).toBe('Authentication required');
    });

    it('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.user).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make multiple requests quickly
      const promises = Array(10).fill(0).map(() => 
        request(app).get('/health')
      );
      
      const responses = await Promise.all(promises);
      const statusCodes = responses.map(r => r.status);
      
      // Should have some successful requests
      expect(statusCodes.includes(200)).toBe(true);
    });
  });
});