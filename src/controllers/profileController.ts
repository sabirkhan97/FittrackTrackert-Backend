import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import  Exercise  from '../models/Exercise';
import { logger } from '../utils/logger';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const exercises = await Exercise.find({ user: userId }).sort({ exercise_date: -1 });
    res.json({ user, exercises });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const { email, username } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
      _id: { $ne: userId },
    });
    if (existingUser) {
      return res.status(409).json({ error: existingUser.email === email ? 'Email already in use' : 'Username taken' });
    }

    const user = await User.findByIdAndUpdate(userId, { email, username }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
};