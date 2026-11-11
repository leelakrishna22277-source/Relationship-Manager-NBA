import { prisma } from '../config/db.js';
import { adjustNbaTextForMaturity, formatEvidence } from '../utils/evidence.js';

export const rmService = {
  /**
   * Computes personalized RM dashboard metrics, portfolio AUM, 30-day maturing deposits, and active NBAs.
   */
  async getRmDashboard(user) {
    const rmId = user.id;

    // Get RM's clients
    const clients = await prisma.client.findMany({
      where: { rm_id: rmId },
      include: {
        holdings: true,
        signals: true,
        nbas: {
          include: { client: true },
        },
      },
    });

    // Compute total AUM & maturing deposits
    let totalAum = 0;
    let maturingDepositsCount = 0;
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    for (const c of clients) {
      for (const h of c.holdings) {
        totalAum += Number(h.balance || 0);
        if (h.maturity_date && h.maturity_date >= now && h.maturity_date <= thirtyDaysFromNow) {
          maturingDepositsCount++;
        }
      }
    }

    // Active NBAs
    const allNbas = clients.flatMap((c) => c.nbas);
    const activeNbas = allNbas.filter((n) => n.status === 'PENDING');

    // Recent signals
    const allSignals = clients.flatMap((c) => c.signals);
    allSignals.sort((a, b) => b.detected_at.getTime() - a.detected_at.getTime());

    // Outcomes for conversion rate
    const outcomes = await prisma.nbaOutcome.findMany({
      where: { recorded_by_rm_id: rmId },
    });

    const totalNbasCount = allNbas.length || 1;
    const actedOnRate = outcomes.length > 0 ? outcomes.length / totalNbasCount : 0.75;

    // Pending follow-ups
    const pendingFollowups = outcomes.filter(
      (o) => o.outcome === 'FOLLOW_UP_REQUIRED' && o.follow_up_date && o.follow_up_date >= now
    ).length;

    return {
      assignedClientsCount: clients.length,
      totalAum,
      activeNbasCount: activeNbas.length,
      maturingDepositsCount,
      pendingFollowupsCount: pendingFollowups,
      actedOnRate: Math.min(1, actedOnRate),
      recentNbas: activeNbas.slice(0, 5).map((n) => {
        let title = n.title;
        let reason = n.reason;
        let evidence = n.evidence;
        if (n.action_type === 'DEPOSIT_ROLLOVER' || (title && title.toLowerCase().includes('maturing'))) {
          const clientObj = clients.find((c) => c.id === n.client_id);
          const holding = clientObj?.holdings?.find(
            (h) => h.id === n.suggested_product_id || h.maturity_date
          );
          if (holding && holding.maturity_date) {
            const adjusted = adjustNbaTextForMaturity(title, reason, holding.maturity_date, new Date(), evidence);
            title = adjusted.title;
            reason = adjusted.reason;
            if (adjusted.evidence) {
              evidence = adjusted.evidence;
            }
          }
        }

        return {
          id: n.id,
          client_id: n.client_id,
          action_type: n.action_type,
          title,
          reason,
          evidence: formatEvidence(evidence, { ...n, title, reason }),
          priority: n.priority,
          status: n.status === 'PENDING' ? 'ACTIVE' : n.status,
          confidence: n.confidence || 0.85,
          suitability: n.suitability || { is_suitable: true, overall_status: 'PASS', rules: [] },
          generated_at: n.generated_at.toISOString(),
          created_at: n.created_at.toISOString(),
          client: {
            id: n.client.id,
            full_name: n.client.full_name,
            segment: n.client.segment,
          },
        };
      }),
      recentSignals: allSignals.slice(0, 5).map((s) => ({
        id: s.id,
        client_id: s.client_id,
        type: s.type,
        data: s.data,
        detected_at: s.detected_at.toISOString(),
      })),
    };
  },

  /**
   * Retrieves RM-filtered interaction outcomes with composite deduplication.
   */
  async getRmOutcomes(user, query = {}) {
    const rmId = user.id;
    const { outcome } = query;

    const where = { recorded_by_rm_id: rmId };
    if (outcome && outcome !== 'ALL') {
      where.outcome = outcome;
    }

    const outcomes = await prisma.nbaOutcome.findMany({
      where,
      include: {
        nba: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const seen = new Set();
    const uniqueOutcomes = [];
    for (const o of outcomes) {
      const key = o.nba?.client?.id
        ? `${o.nba.client.id}_${o.nba.action_type || o.nba_id}`
        : o.nba_id;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueOutcomes.push(o);
      }
    }

    return uniqueOutcomes.map((o) => ({
      id: o.id,
      nba_id: o.nba_id,
      recorded_by_rm_id: o.recorded_by_rm_id,
      action_taken: o.action_taken,
      outcome: o.outcome,
      notes: o.notes,
      follow_up_date: o.follow_up_date ? o.follow_up_date.toISOString() : null,
      created_at: o.created_at.toISOString(),
      nba: o.nba
        ? {
            id: o.nba.id,
            title: o.nba.title,
            action_type: o.nba.action_type,
            client: o.nba.client
              ? {
                  id: o.nba.client.id,
                  full_name: o.nba.client.full_name,
                  segment: o.nba.client.segment,
                }
              : undefined,
          }
        : undefined,
    }));
  },

  /**
   * Records or updates client interaction outcome and marks the NBA as completed.
   */
  async recordNbaOutcome(nbaId, payload, user) {
    const { action_taken = true, outcome, notes, follow_up_date } = payload;
    const rmId = user.id;

    if (!outcome) {
      const error = new Error('Outcome is required.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const existing = await prisma.nbaOutcome.findFirst({
      where: { nba_id: nbaId },
    });

    let savedOutcome;
    let statusCode = 201;

    if (existing) {
      savedOutcome = await prisma.nbaOutcome.update({
        where: { id: existing.id },
        data: {
          recorded_by_rm_id: rmId,
          action_taken: Boolean(action_taken),
          outcome,
          notes: notes || null,
          follow_up_date: follow_up_date ? new Date(follow_up_date) : null,
        },
        include: {
          nba: {
            include: { client: true },
          },
        },
      });
      statusCode = 200;
    } else {
      savedOutcome = await prisma.nbaOutcome.create({
        data: {
          nba_id: nbaId,
          recorded_by_rm_id: rmId,
          action_taken: Boolean(action_taken),
          outcome,
          notes: notes || null,
          follow_up_date: follow_up_date ? new Date(follow_up_date) : null,
        },
        include: {
          nba: {
            include: { client: true },
          },
        },
      });
    }

    // Update NBA status to COMPLETED
    await prisma.nextBestAction.update({
      where: { id: nbaId },
      data: { status: 'COMPLETED' },
    }).catch(() => {});

    return {
      statusCode,
      data: {
        id: savedOutcome.id,
        nba_id: savedOutcome.nba_id,
        recorded_by_rm_id: savedOutcome.recorded_by_rm_id,
        action_taken: savedOutcome.action_taken,
        outcome: savedOutcome.outcome,
        notes: savedOutcome.notes,
        follow_up_date: savedOutcome.follow_up_date ? savedOutcome.follow_up_date.toISOString() : null,
        created_at: savedOutcome.created_at.toISOString(),
      },
    };
  },

  /**
   * Triggers scheduled or on-demand signal evaluation across eligible clients.
   */
  async triggerSignalEvaluation(payload, user) {
    const { evaluateEligibleClientSignals } = await import('./nbaScheduler.service.js');
    const { force = false } = payload || {};
    return evaluateEligibleClientSignals({
      rmId: user.role === 'RM' ? user.id : null,
      force: Boolean(force),
    });
  },
};

