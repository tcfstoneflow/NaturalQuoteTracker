import { AuthUser } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
    interface Session {
      token?: string;
      userId?: number;
    }
  }
}