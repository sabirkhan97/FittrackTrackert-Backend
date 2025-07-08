import mongoose, { Schema, Document } from 'mongoose';

export interface IExercise extends Document {
  user: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight?: number;
  exercise_date: Date;
  workout_type: string;
  muscle_group?: string;
  set_type?: string;
  additional_exercises?: string[];
  notes: string;
  created_at: Date;
  updated_at: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    user: { type: String, ref: 'User', required: true },
    exercise_name: { type: String, required: true },
    sets: { type: Number, required: true },
    reps: { type: Number, required: true },
    weight: { type: Number },
    exercise_date: { type: Date, required: true },
    workout_type: { type: String, required: true },
    muscle_group: { type: String },
    set_type: { type: String },
    additional_exercises: [{ type: String }],
    notes: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.model<IExercise>('Exercise', exerciseSchema);