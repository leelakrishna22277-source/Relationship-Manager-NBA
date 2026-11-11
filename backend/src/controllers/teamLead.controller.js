import { teamLeadService } from '../services/teamLead.service.js';

export async function getTeamLeadDashboard(req, res, next) {
  try {
    const data = await teamLeadService.getTeamLeadDashboard();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeamRms(req, res, next) {
  try {
    const rms = await teamLeadService.getTeamRms();
    return res.status(200).json({
      success: true,
      data: rms,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeamOutcomes(req, res, next) {
  try {
    const outcomes = await teamLeadService.getTeamOutcomes(req.query);
    return res.status(200).json({
      success: true,
      data: outcomes,
    });
  } catch (error) {
    next(error);
  }
}
