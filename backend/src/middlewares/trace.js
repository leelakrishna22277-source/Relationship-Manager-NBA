import crypto from 'node:crypto';
import { logger } from '../utils/logger.js';

/**
 * End-to-end distributed tracing middleware.
 * Captures or generates an X-Request-Id, attaches it to the request and response,
 * and logs structured timing and status upon completion.
 */
export function traceMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId = (typeof incomingId === 'string' && incomingId.trim().length > 0)
    ? incomingId.trim()
    : `req-${crypto.randomUUID()}`;

  req.requestId = requestId;
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startHr = process.hrtime.bigint();

  res.on('finish', () => {
    const endHr = process.hrtime.bigint();
    const durationMs = (Number(endHr - startHr) / 1_000_000).toFixed(2);
    const userId = req.user ? req.user.id : 'ANONYMOUS';
    const userRole = req.user ? req.user.role : 'NONE';

    logger.info(
      `[TRACE] ${req.method} ${req.originalUrl} -> ${res.statusCode} in ${durationMs}ms | requestId=${requestId} | user=${userId} (${userRole})`
    );
  });

  next();
}

