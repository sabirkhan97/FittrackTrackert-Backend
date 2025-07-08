import { Router } from 'express';
import  {authMiddleware}  from '../middleware/authMiddleware';
import { saveWorkout } from '../controllers/workoutPlanController';

export const workoutRoutes = Router();

workoutRoutes.use(authMiddleware);
workoutRoutes.post('/workouts', saveWorkout);
