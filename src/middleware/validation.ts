import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { fromZodError } from 'zod-validation-error';
import logger from '../config/logger.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        logger.warn('Request validation failed:', { 
          path: req.path, 
          errors: error.errors 
        });
        res.status(400).json({
          error: 'Validation failed',
          details: validationError.message,
          issues: error.errors
        });
      } else {
        logger.error('Unexpected validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        logger.warn('Query validation failed:', { 
          path: req.path, 
          errors: error.errors 
        });
        res.status(400).json({
          error: 'Query validation failed',
          details: validationError.message,
          issues: error.errors
        });
      } else {
        logger.error('Unexpected query validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        logger.warn('Params validation failed:', { 
          path: req.path, 
          errors: error.errors 
        });
        res.status(400).json({
          error: 'Parameter validation failed',
          details: validationError.message,
          issues: error.errors
        });
      } else {
        logger.error('Unexpected params validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}