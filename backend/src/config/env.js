import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:24Pa5a1240$@localhost:5432/bnk10_db?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-for-bnk10-development-environment-min-32-chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
