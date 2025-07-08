import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { logger } from './utils/logger';

// ✅ Routes
import { authRoutes } from './routes/auth';
import exerciseRoutes from './routes/exercise';
import workoutPlansRouter from './routes/workoutPlans';
import plansRouter from './routes/plans';
import dashboardRouter from './routes/dashboard';
import profileRouter from './routes/profile';
import adminRoutes from './routes/admin';
import dietPlansRouter from './routes/dietPlans';

// ✅ Middlewares
import { errorHandler } from './middleware/errorHandler';

// ✅ Load .env
dotenv.config();

// ✅ Create app
const app = express();

// ✅ Security, CORS, JSON body parsing
app.use(cors());
app.use(helmet());
app.use(express.json());

// ✅ Global rate limiter
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.',
  })
);

// ✅ Simple request logger
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// ✅ Mongo connection
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => logger.info('✅ MongoDB connected'))
  .catch((err) => logger.error('❌ MongoDB connection error:', err));

// ✅ API routes
app.use('/api/auth', authRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workout-plans', workoutPlansRouter);
app.use('/api/plans', plansRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/diet-plans', dietPlansRouter);


// ✅ Health check
app.get('/', (req, res) => res.send('✅ API is working'));

// ✅ 404 Handler
app.use((req, res) => {
  logger.warn(`[404] ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

// ✅ Error Handler
app.use(errorHandler);

// ✅ Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});

// ✅ Export for tests (optional)
export default app;
