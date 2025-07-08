import express from 'express';
import {pool} from '../config/db'; // ✅ consistent named export
import authMiddleware from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

/**
 * ✅ GET /api/profile
 * Get user info + all their exercises.
 */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user details
    const userResult = await pool.query(
      'SELECT id, email, username FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user exercises
    const exerciseResult = await pool.query(
      `SELECT id, exercise_name, sets, reps, weight, exercise_date,
              workout_type, muscle_group, set_type, additional_exercises, notes
       FROM exercises
       WHERE user_id = $1
       ORDER BY exercise_date DESC`,
      [userId]
    );

    return res.json({
      user,
      exercises: exerciseResult.rows || [],
    });
  } catch (err: any) {
    console.error('[Profile GET] error:', err.message || err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * ✅ PATCH /api/profile
 * Update user email + username.
 */
router.patch('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, username } = req.body;
    if (!email || !username) {
      return res
        .status(400)
        .json({ error: 'Email and username are required' });
    }

    const updateResult = await pool.query(
      `UPDATE users 
       SET email = $1, username = $2 
       WHERE id = $3 
       RETURNING id, email, username`,
      [email, username, userId]
    );

    return res.json({ user: updateResult.rows[0] });
  } catch (err: any) {
    console.error('[Profile PATCH] error:', err.message || err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
