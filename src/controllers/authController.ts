import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Exercise from '../models/Exercise';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const createExercise = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.warn('[createExercise] Unauthorized - no user ID');
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

    if (!exercise_name || !sets || !reps || !workout_type || !exercise_date) {
      logger.warn('[createExercise] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
      additional_exercises,
      notes,
      duration,
    });

    await exercise.save();
    logger.info(`[createExercise] Exercise saved for user ${userId}: ${exercise_name}`);
    res.status(201).json({ exercise });
  } catch (error: any) {
    logger.error('[createExercise] Error saving exercise:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to create exercise', details: error.message });
  }
};

export const getExercises = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.warn('[getExercises] Unauthorized - no user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    logger.info(`[getExercises] Fetching exercises for user: ${userId}`); // Debug
    const exercises = await Exercise.find({ user: userId }).sort({ exercise_date: -1 });
    logger.info(`[getExercises] Retrieved ${exercises.length} exercises for user ${userId}:`, exercises); // Debug
    res.json({ exercises });
  } catch (error: any) {
    logger.error('[getExercises] Error fetching exercises:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to fetch exercises', details: error.message });
  }
};

export const deleteExercise = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      logger.warn('[deleteExercise] Unauthorized - no user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`[deleteExercise] Invalid exercise ID: ${id}`);
      return res.status(400).json({ error: 'Invalid exercise ID' });
    }

    const exercise = await Exercise.findOneAndDelete({ _id: id, user: userId });
    if (!exercise) {
      logger.warn(`[deleteExercise] Exercise not found or unauthorized: ${id}`);
      return res.status(404).json({ error: 'Exercise not found or unauthorized' });
    }

    logger.info(`[deleteExercise] Exercise deleted for user ${userId}: ${id}`);
    res.json({ message: 'Exercise deleted successfully' });
  } catch (error: any) {
    logger.error('[deleteExercise] Error deleting exercise:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to delete exercise', details: error.message });
  }
};