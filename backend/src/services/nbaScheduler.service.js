import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { generateClientNbaPipeline } from './clientNba.service.js';

let isJobRunning = false;
let schedulerTimer = null;

/**
 * Evaluates active customer signals and generates NBAs automatically for eligible clients.
 * Idempotent: Prevents duplicate recommendations by skipping clients with active pending NBAs.
 */
export async function evaluateEligibleClientSignals(options = {}) {
  const { rmId = null, force = false } = options;
  if (isJobRunning && !force) {
    logger.info('NBA evaluation job is already in progress. Skipping concurrent run.');
    return { status: 'SKIPPED', message: 'Job already in progress' };
  }

  isJobRunning = true;
  const startTime = Date.now();
  const summary = {
    evaluated_clients: 0,
    generated_nbas: 0,
    skipped_clients: 0,
    failures: [],
  };

  try {
    const whereClient = {
      signals: { some: {} }, // Clients with at least one active signal
    };

    if (rmId) {
      whereClient.rm_id = rmId;
    }

    const eligibleClients = await prisma.client.findMany({
      where: whereClient,
      include: {
        signals: true,
        nbas: {
          where: { status: 'PENDING' },
        },
      },
    });

    for (const client of eligibleClients) {
      // If client already has pending recommendations and force is false, skip to prevent duplicates
      if (client.nbas.length > 0 && !force) {
        summary.skipped_clients += 1;
        continue;
      }

      try {
        summary.evaluated_clients += 1;
        const result = await generateClientNbaPipeline(client.id);
        if (result && result.recommendations) {
          summary.generated_nbas += result.recommendations.length;
        }
      } catch (err) {
        logger.error(`Automated NBA generation failed for client ${client.id}: ${err.message}`);
        summary.failures.push({ client_id: client.id, error: err.message });
      }
    }

    const durationMs = Date.now() - startTime;
    logger.info(`Automated NBA Evaluation completed in ${durationMs}ms: ${summary.generated_nbas} recommendations generated across ${summary.evaluated_clients} clients.`);

    return {
      status: 'COMPLETED',
      duration_ms: durationMs,
      ...summary,
    };
  } finally {
    isJobRunning = false;
  }
}

/**
 * Starts the periodic background signal evaluation timer (default: every 5 minutes).
 */
export function startNbaScheduler(intervalMs = 5 * 60 * 1000) {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  logger.info(`Starting automatic NBA signal evaluation scheduler (interval: ${intervalMs / 1000}s).`);
  schedulerTimer = setInterval(() => {
    evaluateEligibleClientSignals().catch((err) => {
      logger.error(`Unhandled error in background NBA scheduler: ${err.message}`);
    });
  }, intervalMs);
}

export function stopNbaScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
