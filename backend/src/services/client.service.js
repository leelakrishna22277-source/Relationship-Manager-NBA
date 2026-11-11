import { prisma } from '../config/db.js';
import { generateClientNbaPipeline } from './clientNba.service.js';
import { formatEvidence, adjustNbaTextForMaturity, getCalendarDaysRemaining } from '../utils/evidence.js';

export const clientService = {
  /**
   * Retrieves paginated clients with RM data isolation and computed portfolio statistics.
   */
  async getClients(query = {}, user) {
    const isTeamLead = user?.role === 'TEAM_LEAD';
    const { search, segment, risk_profile, risk_tolerance, rm_id, page = 1, limit } = query;

    const where = {};

    // Per-RM Data Isolation: RM only sees their assigned clients
    if (!isTeamLead) {
      where.rm_id = user.id;
    } else if (rm_id) {
      if (rm_id === 'UNASSIGNED') {
        where.rm_id = null;
      } else if (rm_id !== 'ALL') {
        where.rm_id = rm_id;
      }
    }

    if (segment && segment !== 'ALL') {
      where.segment = segment;
    }

    const rawRisk = risk_tolerance || risk_profile;
    if (rawRisk && rawRisk !== 'ALL') {
      const u = String(rawRisk).toUpperCase();
      where.risk_profile = u === 'CONSERVATIVE' ? 'LOW' : u === 'MODERATE' ? 'MEDIUM' : u === 'AGGRESSIVE' ? 'HIGH' : u;
    }

    if (search && search.trim()) {
      where.full_name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const defaultLimit = isTeamLead ? 10 : 50;
    const take = limit ? parseInt(limit, 10) : defaultLimit;
    const skip = (parseInt(page, 10) - 1) * take;

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          holdings: {
            include: { product: true },
          },
          signals: true,
          nbas: {
            where: { status: 'PENDING' },
          },
          rm: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: 'asc' },
        skip,
        take,
      }),
      prisma.client.count({ where }),
    ]);

    const formatted = clients.map((c) => {
      const computedTotalBalance = c.holdings.reduce(
        (sum, h) => sum + Number(h.balance || 0),
        0
      );

      return {
        id: c.id,
        rm_id: c.rm_id,
        rm_name: c.rm ? c.rm.name : null,
        full_name: c.full_name,
        email: isTeamLead ? 'masked@banking.internal' : c.email,
        phone: isTeamLead ? '+91 ••••• •••••' : c.phone,
        segment: c.segment,
        risk_profile: c.risk_profile,
        client_since: c.client_since ? c.client_since.toISOString() : c.created_at.toISOString(),
        kyc_status: c.kyc_status || 'VERIFIED',
        tax_residency: c.tax_residency || 'DOMESTIC',
        total_balance: computedTotalBalance || Number(c.total_balance || 0),
        holdings_count: c.holdings.length,
        signals_count: c.signals.length,
        active_nbas_count: c.nbas.length,
        created_at: c.created_at.toISOString(),
      };
    });

    return {
      data: formatted,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  /**
   * Retrieves single Client 360 profile with strict RM ownership authorization.
   */
  async getClientById(id, user) {
    const isTeamLead = user?.role === 'TEAM_LEAD';

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        holdings: {
          include: { product: true },
        },
        signals: true,
        nbas: {
          include: { suggested_product: true },
        },
      },
    });

    if (!client) {
      const error = new Error('Client profile not found.');
      error.statusCode = 404;
      error.status = 404;
      error.code = 'CLIENT_NOT_FOUND';
      throw error;
    }

    if (!isTeamLead && client.rm_id !== user.id) {
      const error = new Error('Access restricted: this client is assigned to another Relationship Manager.');
      error.statusCode = 403;
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const computedTotalBalance = client.holdings.reduce(
      (sum, h) => sum + Number(h.balance || 0),
      0
    );

    return {
      id: client.id,
      rm_id: client.rm_id,
      full_name: isTeamLead ? `Client ${client.id.slice(-4).toUpperCase()}` : client.full_name,
      email: isTeamLead ? 'masked@banking.internal' : client.email,
      phone: isTeamLead ? '+91 ••••• •••••' : client.phone,
      segment: client.segment,
      risk_profile: client.risk_profile,
      client_since: client.client_since ? client.client_since.toISOString() : client.created_at.toISOString(),
      kyc_status: client.kyc_status || 'VERIFIED',
      tax_residency: client.tax_residency || 'DOMESTIC',
      total_balance: computedTotalBalance || Number(client.total_balance || 0),
      holdings_count: client.holdings.length,
      signals_count: client.signals.length,
      active_nbas_count: client.nbas.filter((n) => n.status === 'PENDING').length,
      created_at: client.created_at.toISOString(),
    };
  },

  /**
   * Retrieves client holdings with verified account numbers, start dates, and product rates.
   */
  async getClientHoldings(id, user) {
    const isTeamLead = user?.role === 'TEAM_LEAD';

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      const error = new Error('Client not found.');
      error.statusCode = 404;
      error.status = 404;
      error.code = 'CLIENT_NOT_FOUND';
      throw error;
    }

    if (!isTeamLead && client.rm_id !== user.id) {
      const error = new Error('Unauthorized client access.');
      error.statusCode = 403;
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const holdings = await prisma.holding.findMany({
      where: { client_id: id },
      include: { product: true },
      orderBy: { created_at: 'desc' },
    });

    return holdings.map((h) => ({
      id: h.id,
      client_id: h.client_id,
      product_id: h.product_id,
      balance: Number(h.balance),
      currency: h.currency || 'USD',
      status: h.status || 'ACTIVE',
      account_number: h.account_number || null,
      start_date: h.start_date ? h.start_date.toISOString() : null,
      interest_rate_bps: h.interest_rate_bps ?? (h.product ? h.product.expected_return_bps : null),
      maturity_date: h.maturity_date ? h.maturity_date.toISOString() : null,
      created_at: h.created_at.toISOString(),
      product: h.product
        ? {
            id: h.product.id,
            name: h.product.name,
            category: h.product.category,
            risk_rating: h.product.risk_rating,
            min_investment: h.product.min_investment ? Number(h.product.min_investment) : null,
            expected_return_bps: h.product.expected_return_bps,
            tenure_months: h.product.tenure_months,
            tax_treatment: h.product.tax_treatment,
            is_active: h.product.is_active,
            created_at: h.product.created_at.toISOString(),
          }
        : undefined,
    }));
  },

  /**
   * Retrieves signals with dynamic maturity remaining days calculation.
   */
  async getClientSignals(id, user) {
    const isTeamLead = user?.role === 'TEAM_LEAD';

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        holdings: { include: { product: true } },
      },
    });
    if (!client) {
      const error = new Error('Client not found.');
      error.statusCode = 404;
      error.status = 404;
      error.code = 'CLIENT_NOT_FOUND';
      throw error;
    }

    if (!isTeamLead && client.rm_id !== user.id) {
      const error = new Error('Unauthorized client access.');
      error.statusCode = 403;
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const signals = await prisma.signal.findMany({
      where: { client_id: id },
      orderBy: { detected_at: 'desc' },
    });

    const now = Date.now();
    return signals.map((s) => {
      let data = s.data || {};
      if (s.type.includes('MATUR') || s.type.includes('DEPOSIT')) {
        const holding = client.holdings.find(
          (h) => h.id === data.holding_id || h.id === data.holdingId || h.maturity_date
        );
        if (holding && holding.maturity_date) {
          const diffDays = Math.max(0, getCalendarDaysRemaining(holding.maturity_date));
          data = {
            ...data,
            days_remaining: diffDays,
            days: diffDays,
            maturity_date: holding.maturity_date.toISOString(),
            holding_name: holding.product?.name || 'Fixed Deposit',
            principal: Number(holding.balance || data.principal || 0),
          };
        }
      }

      return {
        id: s.id,
        client_id: s.client_id,
        type: s.type,
        data,
        status: s.status || 'ACTIVE',
        expires_at: s.expires_at ? s.expires_at.toISOString() : null,
        detected_at: s.detected_at.toISOString(),
        created_at: s.created_at.toISOString(),
      };
    });
  },

  /**
   * Retrieves Next Best Actions for a client with deduplication.
   */
  async getClientNbas(id, user) {
    const isTeamLead = user?.role === 'TEAM_LEAD';

    const client = await prisma.client.findUnique({
      where: { id },
      include: { holdings: true },
    });
    if (!client) {
      const error = new Error('Client not found.');
      error.statusCode = 404;
      error.status = 404;
      error.code = 'CLIENT_NOT_FOUND';
      throw error;
    }

    if (!isTeamLead && client.rm_id !== user.id) {
      const error = new Error('Unauthorized client access.');
      error.statusCode = 403;
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const nbas = await prisma.nextBestAction.findMany({
      where: { client_id: id },
      include: {
        suggested_product: true,
        client: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const seenActions = new Map();
    for (const n of nbas) {
      const actionKey = n.suggested_product_id
        ? `${n.action_type}_${n.suggested_product_id}`
        : n.action_type;

      if (!seenActions.has(actionKey)) {
        seenActions.set(actionKey, n);
      } else {
        const existing = seenActions.get(actionKey);
        if (
          (n.status === 'COMPLETED' || n.status === 'ACCEPTED') &&
          existing.status === 'PENDING'
        ) {
          seenActions.set(actionKey, n);
        }
      }
    }

    const uniqueNbas = Array.from(seenActions.values());

    return uniqueNbas.map((n) => {
      let title = n.title;
      let reason = n.reason;

      let evidence = n.evidence;
      if ((n.status === 'PENDING' || n.status === 'ACTIVE') && (n.action_type === 'DEPOSIT_ROLLOVER' || (title && title.toLowerCase().includes('maturing')))) {
        const holding = (client.holdings || []).find(
          (h) => h.id === n.suggested_product_id || h.product_id === n.suggested_product_id || h.maturity_date
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
        suitability: n.suitability || {
          is_suitable: true,
          overall_status: 'PASS',
          evaluated_at: n.created_at.toISOString(),
          rules: [],
        },
        dismissal_rationale: n.dismissal_rationale || null,
        expires_at: n.expires_at ? n.expires_at.toISOString() : null,
        generated_at: n.generated_at.toISOString(),
        created_at: n.created_at.toISOString(),
        client: {
          id: client.id,
          full_name: isTeamLead ? `Client ${client.id.slice(-4).toUpperCase()}` : client.full_name,
          segment: client.segment,
          risk_profile: client.risk_profile,
          rm_id: client.rm_id,
          created_at: client.created_at.toISOString(),
        },
      };
    });
  },

  /**
   * Generates dynamic AI Next Best Actions for a client.
   */
  async generateClientNbas(id, user, requestId) {
    const isTeamLead = user?.role === 'TEAM_LEAD';

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      const error = new Error('Client profile not found.');
      error.statusCode = 404;
      error.status = 404;
      error.code = 'CLIENT_NOT_FOUND';
      throw error;
    }

    if (!isTeamLead && client.rm_id !== user.id) {
      const error = new Error('Unauthorized client access.');
      error.statusCode = 403;
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const result = await generateClientNbaPipeline(id, requestId);
    return result;
  },

  /**
   * Assigns an RM to a client (Team Lead action).
   */
  async assignClientRm(id, rmId, user) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      const error = new Error('Client not found.');
      error.status = 404;
      error.code = 'CLIENT_NOT_FOUND';
      throw error;
    }

    let rmName = null;
    if (rmId) {
      const rm = await prisma.rm.findUnique({ where: { id: rmId } });
      if (!rm) {
        const error = new Error('Target RM not found.');
        error.status = 404;
        error.code = 'RM_NOT_FOUND';
        throw error;
      }
      rmName = rm.name;
    }

    const updated = await prisma.client.update({
      where: { id },
      data: { rm_id: rmId || null },
      include: {
        rm: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      id: updated.id,
      full_name: updated.full_name,
      rm_id: updated.rm_id,
      rm_name: updated.rm ? updated.rm.name : rmName,
      segment: updated.segment,
      updated_at: new Date().toISOString(),
    };
  },
};
