import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDb() {
  try {
    await prisma.$connect();
    return true;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error.message);
    throw error;
  }
}
