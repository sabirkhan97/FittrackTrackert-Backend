import express from 'express';
import {pool} from '../config/db';
import authMiddleware from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

// GET /api/admin/users
router.get('/users', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await pool.query(
    'SELECT id, username, email, password, created_at FROM users ORDER BY id'
  );
  res.json(result.rows);
});

export default router;
