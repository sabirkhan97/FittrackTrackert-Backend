// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    is_admin?: boolean; // ✅ Add is_admin type
  };
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      is_admin?: boolean;
    };

    req.user = {
      id: decoded.id,
      is_admin: decoded.is_admin || false, // ✅ include is_admin
    };

    next();
  } catch (error: any) {
    console.error('[authMiddleware] Invalid token:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export default authMiddleware;
