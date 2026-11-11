import { app } from './app.js';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    await connectDb();
    logger.info('Connected to PostgreSQL successfully.');

    app.listen(env.PORT, () => {
      logger.info(`BNK-10 Backend API running on http://localhost:${env.PORT}`);
      logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Backend startup failure:', error);
    process.exit(1);
  }
}

bootstrap();
