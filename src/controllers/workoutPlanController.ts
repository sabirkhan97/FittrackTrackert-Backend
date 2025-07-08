import { Request, Response } from 'express';
import { pool } from '../config/db';

// Define TypeScript interfaces for request body
interface Exercise {
  exercise_name: string;
  sets: number;
  reps: number;
  weight: number;
  set_type: string;
  notes?: string;
  additional_exercises?: string[];
}

interface SaveWorkoutRequest extends Request {
  user?: { id: number }; // Added user ID from auth middleware
  body: {
    exercise_date: string;
    workout_type: string;
    muscle_group: string;
    exercises: Exercise[];
  };
}

export const saveWorkout = async (req: SaveWorkoutRequest, res: Response) => {
  const { exercise_date, workout_type, muscle_group, exercises } = req.body;
  const userId = req.user?.id;

  if (!userId || !Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'Invalid workout data' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const workoutResult = await client.query(
      `INSERT INTO workouts (user_id, exercise_date, workout_type, muscle_group)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, exercise_date, workout_type, muscle_group]
    );

    const workoutId = workoutResult.rows[0].id;

    for (const ex of exercises) {
      const {
        exercise_name,
        sets,
        reps,
        weight,
        set_type,
        notes,
        additional_exercises = [],
      } = ex;

      const exerciseResult = await client.query(
        `INSERT INTO exercises
         (workout_id, exercise_name, sets, reps, weight, set_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [workoutId, exercise_name, sets, reps, weight, set_type, notes || null]
      );

      const exerciseId = exerciseResult.rows[0].id;

      for (const name of additional_exercises) {
        await client.query(
          `INSERT INTO additional_exercises (exercise_id, additional_exercise_name)
           VALUES ($1, $2)`,
          [exerciseId, name]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Workout saved successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving workout:', err);
    res.status(500).json({ error: 'Failed to save workout' });
  } finally {
    client.release();
  }
};
