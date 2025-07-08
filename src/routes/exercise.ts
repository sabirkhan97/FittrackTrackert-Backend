import { Router, Response, NextFunction } from 'express';
import  authMiddleware  from '../middleware/auth';
import  Exercise  from '../models/Exercise';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.warn('[GET /api/exercises] Unauthorized - no user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      exercise_name,
      workout_type,
      muscle_group,
      set_type,
      weight_min,
      weight_max,
      date_start,
      date_end,
    } = req.query;

    const query: any = { user: userId };
    if (exercise_name) query.exercise_name = { $regex: exercise_name as string, $options: 'i' };
    if (workout_type) query.workout_type = workout_type as string;
    if (muscle_group) query.muscle_group = muscle_group as string;
    if (set_type) query.set_type = set_type as string;
    if (weight_min || weight_max) {
      query.weight = {};
      if (weight_min) query.weight.$gte = Number(weight_min);
      if (weight_max) query.weight.$lte = Number(weight_max);
    }
    if (date_start || date_end) {
      query.exercise_date = {};
      if (date_start) query.exercise_date.$gte = new Date(date_start as string);
      if (date_end) query.exercise_date.$lte = new Date(date_end as string);
    }

    const exercises = await Exercise.find(query).sort({ exercise_date: -1 });
    logger.info(`[GET /api/exercises] Fetched ${exercises.length} exercises for user ${userId}`);
    res.json({ exercises });
  } catch (error: any) {
    logger.error('[GET /api/exercises] Failed to fetch exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises', details: error.message });
  }
});

router.get('/distinct', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const exercises = await Exercise.distinct('exercise_name', { user: userId });
    res.json({ exercises });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.warn('[DELETE /api/exercises/:id] Unauthorized - no user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exercise = await Exercise.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!exercise) {
      logger.warn(`[DELETE /api/exercises/${req.params.id}] Exercise not found or not authorized`);
      return res.status(404).json({ error: 'Exercise not found or not authorized' });
    }

    logger.info(`[DELETE /api/exercises/${req.params.id}] Exercise deleted for user ${userId}`);
    res.json({ message: 'Exercise deleted' });
  } catch (error: any) {
    logger.error('[DELETE /api/exercises/:id] Failed to delete exercise:', error);
    res.status(500).json({ error: 'Failed to delete exercise', details: error.message });
  }
});

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.warn('[POST /api/exercises] Unauthorized - no user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      exercise_name,
      sets,
      reps,
      weight,
      exercise_date,
      workout_type,
      muscle_group,
      set_type,
      additional_exercises,
      notes,
      duration,
    } = req.body;

    const exercise = new Exercise({
      user: userId,
      exercise_name,
      sets,
      reps,
      weight,
      exercise_date: new Date(exercise_date),
      workout_type,
      muscle_group,
      set_type,
      additional_exercises: additional_exercises || [],
      notes,
      duration,
    });

    await exercise.save();
    logger.info(`[POST /api/exercises] Exercise created for user ${userId}`);
    res.status(201).json({ exercise });
  } catch (error: any) {
    logger.error('[POST /api/exercises] Failed to create exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise', details: error.message });
  }
});

export default router;