// src/routes/dietplan.ts

import { Router, Response } from 'express';
import { pool } from '../config/db';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();

// Rate limiter: 10 requests per 15 minutes per user
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req: AuthenticatedRequest) => req.user?.id?.toString() || 'anonymous',
  message: 'Too many requests, please try again later.',
});

// Ollama request helper with retry
const ollamaRequestWithRetry = async (options: any, retries = 3, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      logger.info(`[Ollama] Attempt ${i + 1}: ${options.url}`);
      const response = await axios({
        ...options,
        timeout: 180_000,
      });
      logger.info(`[Ollama] Success on attempt ${i + 1}`);
      return response;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' && i < retries - 1) {
        logger.warn(`[Ollama Retry ${i + 1}/${retries}] Timeout. Retrying after ${delay}ms.`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.error(`[Ollama] Request failed: ${error.message}`);
        throw error;
      }
    }
  }
  throw new Error('Ollama request failed after retries.');
};

/**
 * ✅ POST /api/diet-plans
 * Generate diet plan only (do not save), return for preview.
 */
router.post('/', authMiddleware, limiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ollamaResponse = await ollamaRequestWithRetry({
      method: 'POST',
      url: 'http://localhost:11434/v1/completions',
      data: {
        model: 'llama3:latest',
        prompt: `
You are a helpful AI nutritionist. Respond ONLY with valid JSON matching:
{
  "date": "YYYY-MM-DD",
  "prompt": "<original prompt>",
  "meals": [{"meal_time": "Breakfast", "items": ["Item 1", "Item 2"]}],
  "notes": "Optional notes."
}
Do not explain. Return ONLY JSON.
User prompt:
"""
${prompt}
"""
        `,
        max_tokens: 500,
        temperature: 0.5,
      },
      headers: { 'Content-Type': 'application/json' },
    });

    let dietPlanData;
    try {
      const rawText = ollamaResponse.data.choices?.[0]?.text?.trim();
      dietPlanData = JSON.parse(rawText);
    } catch {
      logger.error('[POST /api/diet-plans] Failed to parse AI response');
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    const { date, meals, notes } = dietPlanData;

    // ✅ Return generated plan without saving
    res.status(200).json({
      dietPlan: {
        user_id: userId,
        date,
        meals,
        notes: notes || '',
        prompt,
      },
    });
  } catch (error: any) {
    logger.error('[POST /api/diet-plans] Error:', { message: error.message });
    res.status(500).json({ error: 'Failed to generate diet plan' });
  }
});

/**
 * ✅ POST /api/diet-plans/save
 * Explicitly save a diet plan when user clicks "Save"
 */
router.post('/save', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { date, meals, notes, prompt } = req.body;
    if (!date || !meals) {
      return res.status(400).json({ error: 'Date and meals are required' });
    }

    const result = await pool.query(
      `INSERT INTO diet_plans (user_id, date, meals, notes, prompt)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, date, JSON.stringify(meals), notes || '', prompt || '']
    );

    res.status(201).json({ dietPlan: result.rows[0] });
  } catch (error: any) {
    logger.error('[POST /api/diet-plans/save] Error:', { message: error.message });
    res.status(500).json({ error: 'Failed to save diet plan' });
  }
});

/**
 * ✅ GET /api/diet-plans/my
 * Fetch all saved plans for the logged-in user
 */
router.get('/my', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT * FROM diet_plans WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ plans: result.rows });
  } catch (error: any) {
    logger.error('[GET /api/diet-plans/my] Error:', { message: error.message });
    res.status(500).json({ error: 'Failed to fetch diet plans' });
  }
});

/**
 * ✅ DELETE /api/diet-plans/:id
 * Delete a specific diet plan owned by the user
 */
// DELETE /api/diet-plans/:id - delete a saved plan
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const planId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure planId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(planId)) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    // Delete only if plan belongs to the requesting user
    const result = await pool.query(
      `DELETE FROM diet_plans WHERE id = $1 AND user_id = $2 RETURNING *`,
      [planId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Diet plan not found or unauthorized' });
    }

    res.json({ message: 'Diet plan deleted successfully', deletedPlan: result.rows[0] });
  } catch (error: any) {
    logger.error('[DELETE /api/diet-plans/:id] Error:', { message: error.message });
    res.status(500).json({ error: 'Failed to delete diet plan' });
  }
});



export default router;
