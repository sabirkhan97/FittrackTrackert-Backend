import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gym_notes',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT) || 5432,
});

// Test the database connection immediately
pool.query('SELECT NOW()')
  .then(() => logger.info('✅ PostgreSQL connected successfully'))
  .catch((err) => {
    logger.error('❌ PostgreSQL connection error:', err);
    process.exit(1);
  });

// Handle connection errors
pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL error:', err);
  process.exit(1);
});