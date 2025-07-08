// ✅ src/types/index.ts

import { Request } from 'express';

/**
 * Extend Express Request with authenticated user.
 */
export interface AuthRequest extends Request {
  user?: {
    id: string; // match what you set in authMiddleware (decoded.id)
    is_admin?: boolean;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string; // MongoDB ObjectId from authMiddleware (decoded.id)

  };
}




/**
 * Single Exercise record.
 */
export interface Exercise {
  id: string;                // UUID from database
  exercise_name: string;     // Name of exercise
  sets: number;              // Number of sets
  reps: number;              // Repetitions per set
  weight?: number;           // Optional weight in kg
  exercise_date: string;     // ISO string date
  workout_type?: string;     // e.g., Bro Split, Push Pull Legs
  muscle_group?: string;     // e.g., Chest, Back
  set_type?: string;         // Superset, Dropset, etc.
  additional_exercises?: string[]; // For Supersets / Alternates
  notes?: string;            // Any notes
}

/**
 * Weekly or daily workout plan.
 */
export interface WorkoutPlan {
  date: string; // e.g., "2025-06-13"
  exercises: {
    exercise_name: string;
    sets: number;
    reps: number;
    weight?: number;
  }[];
}
