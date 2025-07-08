import mongoose, { Schema, Document } from 'mongoose';

/**
 * TypeScript interface describing a single DietPlan document.
 */
export interface DietPlanDoc extends Document {
  user: mongoose.Types.ObjectId; // reference to User
  date: Date;                    // date of the plan
  meals: {
    meal_time: string;           // e.g. Breakfast, Lunch
    items: string[];             // list of food items
  }[];
  notes?: string;                // optional notes or advice
  prompt?: string;               // original prompt used to generate this plan
}

/**
 * Mongoose schema for the DietPlan collection.
 */
const dietPlanSchema = new Schema<DietPlanDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    meals: [
      {
        meal_time: { type: String, required: true },
        items: [{ type: String, required: true }],
      },
    ],
    notes: { type: String },
    prompt: { type: String },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

/**
 * Export the DietPlan model.
 */
export default mongoose.model<DietPlanDoc>('DietPlan', dietPlanSchema);