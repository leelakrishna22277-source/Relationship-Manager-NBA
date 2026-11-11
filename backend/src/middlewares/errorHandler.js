import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error({
    err: {
      message: err.message,
      stack: err.stack,
    },
    method: req.method,
    url: req.originalUrl,
  });

  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'An unexpected server error occurred.',
      details: err.details || null,
    },
  });
}
