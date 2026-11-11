import { nbaService } from '../services/nba.service.js';

export async function getNbas(req, res, next) {
  try {
    const result = await nbaService.getNbas(req.query, req.user);
    return res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function getNbaById(req, res, next) {
  try {
    const { id } = req.params;
    const nba = await nbaService.getNbaById(id, req.user);
    return res.status(200).json({
      success: true,
      data: nba,
    });
  } catch (error) {
    next(error);
  }
}

export async function getNbaSuitability(req, res, next) {
  try {
    const { id } = req.params;
    const suitability = await nbaService.getNbaSuitability(id);
    return res.status(200).json({
      success: true,
      data: suitability,
    });
  } catch (error) {
    next(error);
  }
}

export async function acceptNba(req, res, next) {
  try {
    const { id } = req.params;
    const result = await nbaService.acceptNba(id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function dismissNba(req, res, next) {
  try {
    const { id } = req.params;
    const { rationale, reason } = req.body || {};
    const updated = await nbaService.dismissNba(id, rationale || reason);
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function generateDraft(req, res, next) {
  try {
    const { id } = req.params;
    const draft = await nbaService.generateDraft(id, req.body || {}, req.requestId, req.user);
    return res.status(200).json({
      success: true,
      data: draft,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveOutreach(req, res, next) {
  try {
    const { id } = req.params;
    const saved = await nbaService.saveOutreach(id, req.body || {}, req.user);
    return res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLatestOutreach(req, res, next) {
  try {
    const { id } = req.params;
    const outreach = await nbaService.getLatestOutreach(id);
    return res.status(200).json({
      success: true,
      data: outreach,
    });
  } catch (error) {
    next(error);
  }
}

export async function approveOutreach(req, res, next) {
  try {
    const { outreachId } = req.params;
    const updated = await nbaService.approveOutreach(outreachId);
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function recordContactActivity(req, res, next) {
  try {
    const { outreachId } = req.params;
    const activity = await nbaService.recordContactActivity(outreachId, req.body || {}, req.user);
    return res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
}

export async function getContactActivities(req, res, next) {
  try {
    const { outreachId } = req.params;
    const activities = await nbaService.getContactActivities(outreachId);
    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
}
