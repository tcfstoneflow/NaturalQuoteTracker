import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database.js';
import { auditLogs } from '../../shared/schema.js';
import logger from '../config/logger.js';
import '../types/express.js';

export interface AuditLogData {
  userId?: number;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details ? JSON.stringify(data.details) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

export function auditMiddleware(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the audit entry after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          await createAuditLog({
            userId: req.user?.id,
            action,
            resource,
            resourceId: req.params.id,
            details: {
              method: req.method,
              path: req.path,
              body: req.method !== 'GET' ? req.body : undefined,
              query: Object.keys(req.query).length > 0 ? req.query : undefined,
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
          });
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}