import { Request, Response, Router } from 'express';
import { pool } from '../config/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { AuthenticatedRequest } from '../types';
import { authMiddleware } from '../middleware/authMiddleware';

dotenv.config()

const router = Router();

// ✅ Gmail transporter with App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // ✅ Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // ✅ Check for duplicates
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];
      if (existing.email === email) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      if (existing.username === username) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Insert user with real password
    const result = await pool.query(
      `INSERT INTO users (username, email, password, real_password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email`,
      [username, email, hashedPassword, password]
    );

    // ✅ Send welcome email + log SMTP info
    // const info = await transporter.sendMail({
    //   from: `"FitTrack Pro" <gymtrackernotes@gmail.com>`,
    //   to: email,
    //   subject: 'Welcome to FitTrack Pro!',
    //   html: `
    //     <h2>Hello ${username}!</h2>
    //     <p>Thanks for joining <strong>FitTrack Pro</strong>. Let's smash your goals! 💪</p>
    //   `,
    // });

const info = await transporter.sendMail({
  from: `"FitTrack Pro" <gymtrackernotes@gmail.com>`,
  to: email,
  subject: 'Welcome to FitTrack Pro - Your Fitness Journey Starts Here!',
  html: `
    <div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; color: #333333; max-width: 600px; margin: auto; padding: 0; overflow: hidden; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
      <!-- Header with gradient -->
      <div style="background: linear-gradient(135deg, #3A7BD5 0%, #00D2FF 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to FitTrack Pro</h1>
        <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 10px 0 0;">Let's crush your fitness goals together!</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 30px;">
        <p style="font-size: 18px; line-height: 1.6; margin-bottom: 25px;">
          Hey <strong>${username}</strong>,<br>
          We're thrilled you've joined the FitTrack Pro community! Get ready to transform your fitness journey with our powerful tracking tools.
        </p>
        
        <!-- Callout box -->
        <div style="background: #F8F9FA; border-left: 4px solid #3A7BD5; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-size: 16px; color: #555;">
            <strong>Pro Tip:</strong> Complete your profile setup to get personalized recommendations tailored just for you!
          </p>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://fittrackpro.com/get-started" style="display: inline-block; background: #3A7BD5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(58, 123, 213, 0.3);">
            Start Your Journey
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #F8F9FA; padding: 20px; text-align: center; border-top: 1px solid #EAEAEA; border-radius: 0 0 12px 12px;">
        <p style="font-size: 14px; color: #777777; margin: 0 0 10px;">
          Need help or have questions? Reply to this email or visit our <a href="https://fittrackpro.com/help" style="color: #3A7BD5; text-decoration: none;">Help Center</a>
        </p>
        <p style="font-size: 12px; color: #999999; margin: 10px 0 0;">
          &copy; 2023 FitTrack Pro. All rights reserved.<br>
          <span style="font-size: 11px;">123 Fitness Ave, Health City, HC 12345</span>
        </p>
        
        <!-- Social icons -->
        <div style="margin-top: 15px;">
          <a href="https://facebook.com/fittrackpro" style="display: inline-block; margin: 0 5px;"><img src="https://cdn.example.com/facebook-icon.png" alt="Facebook" width="24"></a>
          <a href="https://instagram.com/fittrackpro" style="display: inline-block; margin: 0 5px;"><img src="https://cdn.example.com/instagram-icon.png" alt="Instagram" width="24"></a>
          <a href="https://twitter.com/fittrackpro" style="display: inline-block; margin: 0 5px;"><img src="https://cdn.example.com/twitter-icon.png" alt="Twitter" width="24"></a>
        </div>
      </div>
    </div>
  `,
});

    console.log('✅ EMAIL SENT INFO:', info);

    // ✅ Sign JWT
    const token = jwt.sign(
      { id: result.rows[0].id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
      },
    });

  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ LOGIN: username OR email
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // username or email

  const result = await pool.query(
    `SELECT * FROM users WHERE username = $1 OR email = $1`,
    [identifier]
  );
  const user = result.rows[0];

  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      is_admin: user.is_admin,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  );

  res.json({ token });
});

// ✅ VERIFY JWT
router.get('/verify', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    const user = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [decoded.id]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user: user.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});


// POST /auth/request-reset
router.post('/request-reset', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const userQuery = await pool.query('SELECT id, username FROM users WHERE email = $1', [email]);
  const user = userQuery.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await pool.query(
    `UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE id = $3`,
    [resetCode, expires, user.id]
  );

  // await transporter.sendMail({
  //   from: `"FitTrack Pro" <${process.env.GMAIL_USER}>`,
  //   to: email,
  //   subject: 'Your FitTrack Pro Password Reset Code',
  //   html: `
  //     <h2>Hello ${user.username},</h2>
  //     <p>Your FitTrack Pro password reset code is:</p>
  //     <h1>${resetCode}</h1>
  //     <p>This code will expire in 10 minutes.</p>
  //     <p>If you did not request this, you can ignore this email.</p>
  //   `,
  // });

  await transporter.sendMail({
  from: `"FitTrack Pro" <${process.env.GMAIL_USER}>`,
  to: email,
  subject: '🔐 Your FitTrack Pro Password Reset Code',
  html: `
    <div style="
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 0;
      color: #1a1a1a;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    ">
      <!-- Header with gradient -->
      <div style="
        background: linear-gradient(135deg, #3A7BD5 0%, #00D2FF 100%);
        padding: 30px 20px;
        text-align: center;
      ">
        <h1 style="
          margin: 0;
          color: white;
          font-size: 24px;
          font-weight: 600;
        ">
          Password Reset Request
        </h1>
      </div>

      <!-- Content -->
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hi <strong>${user.username}</strong>,
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          We received a request to reset your FitTrack Pro password. Here's your verification code:
        </p>

        <!-- Verification code box -->
        <div style="
          background: #F8F9FA;
          border: 1px dashed #3A7BD5;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 0 auto 30px;
          max-width: 300px;
        ">
          <div style="
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #3A7BD5;
            margin: 10px 0;
          ">
            ${resetCode}
          </div>
          <div style="
            font-size: 14px;
            color: #666;
          ">
            Expires in 10 minutes
          </div>
        </div>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Enter this code in the app to complete your password reset.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          If you didn't request this, please ignore this email or contact support if you have concerns.
        </p>

        <div style="margin-top: 40px;">
          <p style="font-size: 14px; color: #666; margin-bottom: 5px;">
            Stay strong,
          </p>
          <p style="font-size: 14px; color: #666; margin: 0;">
            The FitTrack Pro Team
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="
        background: #F8F9FA;
        padding: 20px;
        text-align: center;
        border-top: 1px solid #EAEAEA;
      ">
        <p style="font-size: 12px; color: #999; margin: 0 0 10px;">
          © ${new Date().getFullYear()} FitTrack Pro. All rights reserved.
        </p>
        <p style="font-size: 12px; color: #999; margin: 0;">
          123 Fitness Ave, Health City, HC 12345
        </p>
      </div>
    </div>
  `,
});

  res.json({ message: 'Reset code sent to your email' });
});


// POST /auth/verify-reset-code
router.post('/verify-reset-code', async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.reset_code || !user.reset_code_expires) {
    return res.status(400).json({ error: 'No reset code requested' });
  }

  if (user.reset_code !== code) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  if (new Date() > new Date(user.reset_code_expires)) {
    return res.status(400).json({ error: 'Code expired' });
  }

  res.json({ message: 'Code verified successfully' });
});


// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password required' });
  }

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.reset_code !== code) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  if (new Date() > new Date(user.reset_code_expires)) {
    return res.status(400).json({ error: 'Code expired' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    `UPDATE users SET password = $1, reset_code = NULL, reset_code_expires = NULL WHERE id = $2`,
    [hashedPassword, user.id]
  );

  res.json({ message: 'Password updated successfully' });
});

// POST /auth/reset-login
router.post('/reset-login', async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.reset_code !== code) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  if (new Date() > new Date(user.reset_code_expires)) {
    return res.status(400).json({ error: 'Code expired' });
  }

  await pool.query(
    `UPDATE users SET reset_code = NULL, reset_code_expires = NULL WHERE id = $1`,
    [user.id]
  );

  const token = jwt.sign(
    { id: user.id, is_admin: user.is_admin },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.json({
    message: 'Logged in successfully',
    token,
    user: { id: user.id, username: user.username, email: user.email }
  });
});


router.post('/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!userResult.rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
  if (!valid) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);

  res.json({ message: 'Password updated successfully' });
});


export { router as authRoutes };
