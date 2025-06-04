import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  createLimiter(config: RateLimitConfig) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || 'unknown';
      const now = Date.now();

      // Clean up expired entries
      for (const [key, data] of this.requests.entries()) {
        if (data.resetTime < now) {
          this.requests.delete(key);
        }
      }

      const clientData = this.requests.get(clientId);
      
      if (!clientData || clientData.resetTime < now) {
        // New window for this client
        this.requests.set(clientId, {
          count: 1,
          resetTime: now + config.windowMs
        });
        return next();
      }

      if (clientData.count >= config.maxRequests) {
        return res.status(429).json({
          error: config.message || 'Too many requests, please try again later.',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
      }

      clientData.count++;
      next();
    };
  }
}

export const rateLimiter = new RateLimiter();

// Pre-configured rate limiters
export const authLimiter = rateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.'
});

export const apiLimiter = rateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  message: 'API rate limit exceeded, please try again later.'
});

export const uploadLimiter = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour
  message: 'Upload rate limit exceeded, please try again later.'
});