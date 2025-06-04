import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Request validation middleware factory
export function validateRequest(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  id: z.object({
    id: z.string().regex(/^\d+$/).transform(Number)
  }),

  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    search: z.string().max(100).optional()
  }),

  fileUpload: z.object({
    filename: z.string().min(1).max(255),
    mimetype: z.string().regex(/^(image|application)\//),
    size: z.number().max(50 * 1024 * 1024) // 50MB
  }),

  email: z.string().email().max(254),
  
  phoneNumber: z.string().regex(/^[\+]?[\d\s\-\(\)]{10,20}$/).optional(),
  
  positiveNumber: z.number().positive(),
  
  nonEmptyString: z.string().min(1).max(255),
  
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
};

// Sanitization helpers
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\.\-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

// SQL injection prevention for LIKE queries
export function escapeLikePattern(pattern: string): string {
  return pattern.replace(/[%_\\]/g, '\\$&');
}

// XSS prevention middleware
export function xssProtection(req: Request, res: Response, next: NextFunction) {
  function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return sanitizeHtml(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  }

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
}