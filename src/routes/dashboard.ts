import { Router, Response, NextFunction } from 'express';
import  authMiddleware  from '../middleware/auth';
import  Exercise  from '../models/Exercise'; // Use named import
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';
import dayjs from 'dayjs'; // Ensure correct import

const router = Router();

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.warn('[GET /api/dashboard] Unauthorized - no user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { date_start, date_end, exercise_name, stack_by = 'workout_type' } = req.query;

    const match: any = { user: userId };
    if (date_start) match.exercise_date = { $gte: new Date(date_start as string) };
    if (date_end) {
      match.exercise_date = match.exercise_date || {};
      match.exercise_date.$lte = new Date(date_end as string);
    }
    if (exercise_name) match.exercise_name = exercise_name as string;

    // Overall metrics
    const metrics = await Exercise.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalWorkouts: { $sum: 1 },
          totalSets: { $sum: '$sets' },
          totalReps: { $sum: { $multiply: ['$sets', '$reps'] } },
          averageWeight: { $avg: '$weight' },
          totalDuration: { $sum: '$duration' },
        },
      },
    ]);

    // Weekly metrics (last 7 days)
    const weeklyMatch = {
      ...match,
      exercise_date: {
        $gte: dayjs().subtract(7, 'day').startOf('day').toDate(),
        $lte: dayjs().endOf('day').toDate(),
      },
    };
    const weeklyMetrics = await Exercise.aggregate([
      { $match: weeklyMatch },
      {
        $group: {
          _id: null,
          totalWorkouts: { $sum: 1 },
          totalSets: { $sum: '$sets' },
          totalWeight: { $sum: '$weight' },
        },
      },
    ]);

    // Monthly metrics (last 30 days)
    const monthlyMatch = {
      ...match,
      exercise_date: {
        $gte: dayjs().subtract(30, 'day').startOf('day').toDate(),
        $lte: dayjs().endOf('day').toDate(),
      },
    };
    const monthlyMetrics = await Exercise.aggregate([
      { $match: monthlyMatch },
      {
        $group: {
          _id: null,
          totalWorkouts: { $sum: 1 },
          totalSets: { $sum: '$sets' },
          totalWeight: { $sum: '$weight' },
        },
      },
    ]);

    // Weight progression
    const weightProgression = await Exercise.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$exercise_date' } },
          maxWeight: { $max: '$weight' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', weight: '$maxWeight', _id: 0 } },
    ]);

    // Workout frequency
    const groupByField = stack_by === 'muscle_group' ? '$muscle_group' : '$workout_type';
    const workoutFrequency = await Exercise.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$exercise_date' } },
            type: groupByField,
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          types: {
            $push: {
              type: '$_id.type',
              count: '$count',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', types: 1, _id: 0 } },
    ]);

    // Recent workouts
    const recentWorkouts = await Exercise.find(match)
      .sort({ exercise_date: -1 })
      .limit(5)
      .select('exercise_name sets reps weight exercise_date workout_type muscle_group duration');

    // Unique exercises
    const exercises = await Exercise.distinct('exercise_name', { user: userId });

    logger.info(`[GET /api/dashboard] Fetched dashboard data for user ${userId}`);
    res.json({
      metrics: metrics[0] || { totalWorkouts: 0, totalSets: 0, totalReps: 0, averageWeight: null, totalDuration: 0 },
      weeklyMetrics: weeklyMetrics[0] || { totalWorkouts: 0, totalSets: 0, totalWeight: 0 },
      monthlyMetrics: monthlyMetrics[0] || { totalWorkouts: 0, totalSets: 0, totalWeight: 0 },
      weightProgression,
      workoutFrequency,
      recentWorkouts,
      exercises,
    });
  } catch (error: any) {
    logger.error('[GET /api/dashboard] Failed to fetch dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
});

export default router;