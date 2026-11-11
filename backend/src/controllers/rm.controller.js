import { rmService } from '../services/rm.service.js';

export async function getRmDashboard(req, res, next) {
  try {
    const data = await rmService.getRmDashboard(req.user);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRmOutcomes(req, res, next) {
  try {
    const data = await rmService.getRmOutcomes(req.user, req.query);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function recordNbaOutcome(req, res, next) {
  try {
    const nbaId = req.params.nbaId || req.params.id;
    const { statusCode, data } = await rmService.recordNbaOutcome(nbaId, req.body, req.user);
    return res.status(statusCode).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function triggerSignalEvaluation(req, res, next) {
  try {
    const result = await rmService.triggerSignalEvaluation(req.body, req.user);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
