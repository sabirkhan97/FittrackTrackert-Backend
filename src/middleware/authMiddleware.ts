import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('[authMiddleware] No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as { id: string };
    req.user = { id: decoded.id.toString() }; // Ensure ID is a string
    logger.info(`[authMiddleware] Authenticated user: ${req.user.id}`);
    next();
  } catch (error: any) {
    logger.error('[authMiddleware] Invalid token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};