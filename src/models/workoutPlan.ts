import mongoose, { Schema, Document } from 'mongoose';

/**
 * TypeScript interface describing a single WorkoutPlan document.
 */
export interface IWorkoutPlan extends Document {
  user: string; // User ID as string (matches JWT user id)
  date: Date;   // Date of the workout plan
  exercises: {
    exercise_name: string; // e.g. Bench Press
    sets: number;          // Number of sets
    reps: number;          // Number of reps per set
    weight?: number;       // Optional weight for the exercise
  }[];
  prompt: string;          // Original prompt used to generate the plan
  duration?: number;       // Optional duration in minutes
}

/**
 * Mongoose schema for the WorkoutPlan collection.
 */
const WorkoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    user: { type: String, required: true },
    date: { type: Date, required: true },
    exercises: [
      {
        exercise_name: { type: String, required: true },
        sets: { type: Number, required: true },
        reps: { type: Number, required: true },
        weight: { type: Number },
      },
    ],
    prompt: { type: String, required: true },
    duration: { type: Number },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

/**
 * Export the WorkoutPlan model.
 */
export default mongoose.model<IWorkoutPlan>('WorkoutPlan', WorkoutPlanSchema);
