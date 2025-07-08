// ✅ src/routes/plans.ts

import express from 'express';
import {pool} from '../config/db';
import authMiddleware from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

// ✅ POST /api/plans - save a new workout plan
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { workout_type, target_muscle, plan } = req.body;

    if (!workout_type || !target_muscle || !Array.isArray(plan)) {
      return res.status(400).json({ error: 'Invalid plan data' });
    }

    // Insert plan meta first
    const planResult = await pool.query(
      `INSERT INTO workout_plans (user_id, workout_type, target_muscle, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, workout_type, target_muscle, created_at`,
      [userId, workout_type, target_muscle]
    );
    const savedPlan = planResult.rows[0];

    // Insert exercises linked to plan
    for (const exercise of plan) {
      await pool.query(
        `INSERT INTO workout_plan_exercises 
         (plan_id, exercise_name, sets, reps, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          savedPlan.id,
          exercise.exercise_name,
          exercise.sets,
          exercise.reps,
          exercise.notes || '',
        ]
      );
    }

    res.json({ ...savedPlan });
  } catch (err: any) {
    console.error('Error saving plan:', err.message || err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET /api/plans - fetch all plans for user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch all plans
    const plansResult = await pool.query(
      `SELECT id, workout_type, target_muscle, created_at
       FROM workout_plans
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const plans = [];

    for (const plan of plansResult.rows) {
      const exercisesResult = await pool.query(
        `SELECT exercise_name, sets, reps, notes
         FROM workout_plan_exercises
         WHERE plan_id = $1`,
        [plan.id]
      );

      plans.push({
        ...plan,
        plan: exercisesResult.rows,
      });
    }

    res.json(plans);
  } catch (err: any) {
    console.error('Error fetching plans:', err.message || err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
