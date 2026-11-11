import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Client for communicating with the Python FastAPI AI Service (LangGraph pipeline).
 */
export const aiService = {
  /**
   * Check AI service connectivity and active LLM provider.
   */
  async checkHealth() {
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        return await response.json();
      }
      return { status: 'DEGRADED', error: `HTTP ${response.status}` };
    } catch (error) {
      logger.warn(`AI Service health check failed: ${error.message}`);
      return { status: 'DOWN', error: error.message };
    }
  },

  /**
   * Run the LangGraph NBA pipeline for a Client 360 profile.
   * Fan-out: Parallel LLM generation + Suitability Guard.
   * Fan-in: Grounding validation, catalog check, concentration cap enforcement, ranking.
   */
  async generateNbas(context, requestId = null) {
    const traceId = requestId || context?.requestId || `req-ai-${Date.now()}`;
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/generate-nba`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': traceId,
        },
        body: JSON.stringify(context),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`AI service returned ${response.status}: ${errBody}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`[AI TRACE ${traceId}] NBA Generation failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * Draft grounded, compliant outreach message with citations and injection safeguards.
   */
  async generateOutreach(payload, requestId = null) {
    const traceId = requestId || payload?.requestId || `req-ai-${Date.now()}`;
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/generate-outreach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': traceId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`AI outreach service returned ${response.status}: ${errBody}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`[AI TRACE ${traceId}] Outreach Generation failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * Trigger the Golden Set evaluation suite.
   */
  async runEvals() {
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/evals/run`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
      });
      return await response.json();
    } catch (error) {
      logger.error(`AI Evals failed: ${error.message}`);
      throw error;
    }
  },
};
