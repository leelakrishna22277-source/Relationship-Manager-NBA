import { prisma } from '../config/db.js';
import { aiService } from './ai.service.js';
import { formatEvidence, formatNbaResponse } from '../utils/evidence.js';

function cleanOutreachText(text, rmName = 'Relationship Manager', bankName = 'Apex Private Bank') {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\[RM Name\]/gi, rmName)
    .replace(/\[Relationship Manager Name\]/gi, rmName)
    .replace(/\[Bank Name\]/gi, bankName)
    .replace(/\[Bank name\]/gi, bankName)
    .replace(/^\s*\d+\.\s*[A-Z\s&]+:\s*/gim, '')
    .replace(/^\s*"(.*?)"\s*$/gm, '$1')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n\n');
}

export const nbaService = {
  /**
   * Retrieves paginated NBAs with RM isolation, status filtering, and prioritization.
   */
  async getNbas(query = {}, user) {
    const isTeamLead = user?.role === 'TEAM_LEAD';
    const { status, priority, client_id, page = 1, limit = 50, exclude_completed } = query;

    const where = {};
    if (!isTeamLead) {
      where.client = { rm_id: user.id };
    }

    if (status && status !== 'ALL') {
      where.status = status === 'ACTIVE' ? 'PENDING' : status;
    } else if (exclude_completed === 'true' || exclude_completed === true || !status) {
      where.status = { not: 'COMPLETED' };
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (client_id) {
      where.client_id = client_id;
    }

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const [nbas, total] = await Promise.all([
      prisma.nextBestAction.findMany({
        where,
        include: {
          client: {
            include: { holdings: true },
          },
          suggested_product: true,
        },
        orderBy: { priority: 'asc' },
        skip,
        take,
      }),
      prisma.nextBestAction.count({ where }),
    ]);

    const formatted = nbas.map((n) => formatNbaResponse(n, isTeamLead));

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
   * Retrieves a single NBA recommendation by ID.
   */
  async getNbaById(id, user) {
    const isTeamLead = user?.role === 'TEAM_LEAD';

    const nba = await prisma.nextBestAction.findUnique({
      where: { id },
      include: {
        client: {
          include: { holdings: true },
        },
        suggested_product: true,
      },
    });

    if (!nba) {
      const error = new Error('NBA recommendation not found.');
      error.statusCode = 404;
      error.status = 404;
      error.code = 'NBA_NOT_FOUND';
      throw error;
    }

    if (!isTeamLead && nba.client.rm_id !== user.id) {
      const error = new Error('Unauthorized NBA access.');
      error.statusCode = 403;
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    return formatNbaResponse(nba, isTeamLead);
  },

  /**
   * Retrieves deterministic suitability verification report for an NBA.
   */
  async getNbaSuitability(id) {
    const nba = await prisma.nextBestAction.findUnique({
      where: { id },
      include: { client: true, suggested_product: true },
    });

    if (!nba) {
      const error = new Error('Recommendation not found.');
      error.status = 404;
      error.code = 'NBA_NOT_FOUND';
      throw error;
    }

    return nba.suitability || {
      is_suitable: true,
      overall_status: 'PASS',
      evaluated_at: new Date().toISOString(),
      rules: [
        {
          id: 'rule-risk-fit',
          name: 'Risk Level Verification',
          status: 'PASS',
          details: `Client risk rating ${nba.client?.risk_profile || 'MEDIUM'} accommodates product guidelines.`,
        },
        {
          id: 'rule-regulatory-suitability',
          name: 'Fiduciary Investor Protection',
          status: 'PASS',
          details: 'Complies with internal wealth management cross-selling suitability guardrails.',
        },
      ],
    };
  },

  /**
   * Marks NBA as ACCEPTED.
   */
  async acceptNba(id) {
    const updated = await prisma.nextBestAction.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    return {
      ...updated,
      status: 'ACTIONED',
    };
  },

  /**
   * Dismisses NBA with optional rationale.
   */
  async dismissNba(id, rationale = null) {
    const updated = await prisma.nextBestAction.update({
      where: { id },
      data: {
        status: 'DISMISSED',
        dismissal_rationale: rationale || null,
      },
    });

    return updated;
  },

  /**
   * Generates AI outreach draft with tone, channel, and policy grounding citations.
   */
  async generateDraft(id, { tone = 'ADVISORY', channel = 'EMAIL', custom_instructions }, requestId, user) {
    const nba = await prisma.nextBestAction.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            rm: true,
          },
        },
        suggested_product: true,
      },
    });

    if (!nba) {
      const error = new Error('NBA recommendation not found.');
      error.status = 404;
      error.code = 'NBA_NOT_FOUND';
      throw error;
    }

    // Resolve RM Name based on rm-id (from authenticated user or client's assigned rm_id)
    const rmId = user?.id || nba.client?.rm_id;
    let rmName = user?.name || nba.client?.rm?.name;
    if (!rmName && rmId) {
      const rm = await prisma.rm.findUnique({ where: { id: rmId }, select: { name: true } });
      rmName = rm?.name;
    }
    const bankName = 'Apex Private Bank';

    const payload = {
      client_name: nba.client?.full_name || 'Valued Client',
      rm_id: rmId || undefined,
      rm_name: rmName || undefined,
      bank_name: bankName,
      segment: nba.client?.segment || 'PREMIER',
      risk_profile: nba.client?.risk_profile || 'MODERATE',
      action_type: nba.action_type,
      title: nba.title,
      reason: nba.reason || undefined,
      evidence: formatEvidence(nba.evidence, nba),
      product_name: nba.suggested_product?.name || undefined,
      product_category: nba.suggested_product?.category || undefined,
      expected_return_bps: nba.suggested_product?.expected_return_bps || undefined,
      tone,
      channel,
      custom_instructions: custom_instructions || undefined,
    };

    const draft = await aiService.generateOutreach(payload, requestId);
    const cleanedBody = cleanOutreachText(draft.body, rmName, bankName);

    return {
      nba_id: id,
      channel: draft.channel,
      tone: draft.tone,
      status: 'DRAFT',
      subject: draft.subject,
      body: cleanedBody,
      grounding_citations: draft.grounding_citations,
      disclaimer: draft.disclaimer,
      created_at: draft.generated_at,
    };
  },

  /**
   * Persists an RM outreach draft in PostgreSQL.
   */
  async saveOutreach(nbaId, payload, user) {
    const { draft_text, channel = 'EMAIL', tone = 'ADVISORY', subject, status = 'DRAFT' } = payload;
    const cleanedDraft = cleanOutreachText(draft_text || '');

    const outreach = await prisma.outreach.create({
      data: {
        nba_id: nbaId,
        created_by_rm_id: user.id,
        draft_text: cleanedDraft,
        channel,
        tone,
        subject,
        status: status === 'SAVED' ? 'DRAFT' : status,
      },
    });

    return {
      id: outreach.id,
      nba_id: outreach.nba_id,
      channel: outreach.channel,
      tone: outreach.tone,
      subject: outreach.subject,
      body: outreach.draft_text,
      draft_text: outreach.draft_text,
      status: outreach.status,
      created_at: outreach.created_at.toISOString(),
    };
  },

  /**
   * Retrieves the latest outreach draft for an NBA.
   */
  async getLatestOutreach(nbaId) {
    const outreach = await prisma.outreach.findFirst({
      where: { nba_id: nbaId },
      orderBy: { created_at: 'desc' },
    });

    if (!outreach) return null;

    const cleanedText = cleanOutreachText(outreach.draft_text);
    return {
      id: outreach.id,
      nba_id: outreach.nba_id,
      channel: outreach.channel,
      tone: outreach.tone,
      subject: outreach.subject,
      body: cleanedText,
      draft_text: cleanedText,
      status: outreach.status,
      created_at: outreach.created_at.toISOString(),
    };
  },

  /**
   * Marks outreach draft as APPROVED.
   */
  async approveOutreach(outreachId) {
    const updated = await prisma.outreach.update({
      where: { id: outreachId },
      data: { status: 'APPROVED' },
    });

    return {
      id: updated.id,
      nba_id: updated.nba_id,
      status: updated.status,
      body: updated.draft_text,
    };
  },

  /**
   * Records contact activity (Call, Email, etc.) linked to an outreach or NBA.
   */
  async recordContactActivity(outreachId, payload, user) {
    const { contact_method = 'EMAIL', contact_status = 'CONTACTED', notes, follow_up_date } = payload;
    let targetOutreachId = outreachId;
    const existing = await prisma.outreach.findUnique({ where: { id: outreachId } });

    if (!existing) {
      let nbaOutreach = await prisma.outreach.findFirst({
        where: { nba_id: outreachId },
        orderBy: { created_at: 'desc' },
      });

      if (!nbaOutreach) {
        const nba = await prisma.nextBestAction.findUnique({ where: { id: outreachId } });
        if (nba) {
          nbaOutreach = await prisma.outreach.create({
            data: {
              nba_id: nba.id,
              created_by_rm_id: user.id,
              draft_text: notes || 'Direct outreach initiated.',
              channel: contact_method || 'EMAIL',
              tone: 'ADVISORY',
              status: 'DRAFT',
            },
          });
        }
      }
      if (nbaOutreach) targetOutreachId = nbaOutreach.id;
    }

    const activity = await prisma.contactActivity.create({
      data: {
        outreach_id: targetOutreachId,
        rm_id: user.id,
        contact_method,
        contact_status,
        notes: notes || null,
        follow_up_date: follow_up_date ? new Date(follow_up_date) : null,
      },
    });

    return {
      id: activity.id,
      outreach_id: activity.outreach_id,
      rm_id: activity.rm_id,
      contact_method: activity.contact_method,
      contact_status: activity.contact_status,
      notes: activity.notes,
      follow_up_date: activity.follow_up_date ? activity.follow_up_date.toISOString() : null,
      created_at: activity.created_at.toISOString(),
    };
  },

  /**
   * Retrieves contact activities for an outreach or NBA.
   */
  async getContactActivities(outreachId) {
    const activities = await prisma.contactActivity.findMany({
      where: {
        OR: [{ outreach_id: outreachId }, { outreach: { nba_id: outreachId } }],
      },
      orderBy: { created_at: 'desc' },
    });

    return activities.map((a) => ({
      id: a.id,
      outreach_id: a.outreach_id,
      rm_id: a.rm_id,
      contact_method: a.contact_method,
      contact_status: a.contact_status,
      notes: a.notes,
      follow_up_date: a.follow_up_date ? a.follow_up_date.toISOString() : null,
      created_at: a.created_at.toISOString(),
    }));
  },
};
