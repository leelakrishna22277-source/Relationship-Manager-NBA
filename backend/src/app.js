import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { traceMiddleware } from './middlewares/trace.js';

import authRouter from './routes/auth.routes.js';
import clientRouter from './routes/client.routes.js';
import productRouter from './routes/product.routes.js';
import rmRouter from './routes/rm.routes.js';
import teamLeadRouter from './routes/teamLead.routes.js';
import nbaRouter, { outreachRouter } from './routes/nba.routes.js';

import { logger } from './utils/logger.js';

export const app = express();

// Security and parser middlewares
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
app.use(
  cors({
    origin: [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Tracing and Logging
app.use(traceMiddleware);

// Liveness & health check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'CONNECTED';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = 'DISCONNECTED';
  }

  let aiHealth = { status: 'UNKNOWN' };
  try {
    const aiRes = await fetch(`${env.AI_SERVICE_URL}/api/v1/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (aiRes.ok) {
      aiHealth = await aiRes.json();
    } else {
      aiHealth = { status: 'DEGRADED', http_status: aiRes.status };
    }
  } catch (error) {
    aiHealth = { status: 'DOWN', error: error.message };
  }

  const isHealthy = dbStatus === 'CONNECTED';
  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DEGRADED',
    database: dbStatus,
    ai_service: aiHealth,
    timestamp: new Date().toISOString(),
    service: 'bnk-10-backend',
  });
});

// Mount application API routers
app.use('/api/auth', authRouter);
app.use('/api/clients', clientRouter);
app.use('/api/products', productRouter);
app.use('/api/rm', rmRouter);
app.use('/api/team-lead', teamLeadRouter);
app.use('/api/nbas', nbaRouter);
app.use('/api/outreach', outreachRouter);

// 404 Route Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);
