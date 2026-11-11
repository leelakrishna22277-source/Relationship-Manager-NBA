import { Router } from 'express';
import {
  getNbas,
  getNbaById,
  getNbaSuitability,
  acceptNba,
  dismissNba,
  generateDraft,
  saveOutreach,
  getLatestOutreach,
  approveOutreach,
  recordContactActivity,
  getContactActivities,
} from '../controllers/nba.controller.js';
import { recordNbaOutcome } from '../controllers/rm.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// Core NBA Routes
router.get('/', getNbas);
router.get('/:id', getNbaById);
router.get('/:id/suitability', getNbaSuitability);
router.post('/:id/accept', acceptNba);
router.post('/:id/dismiss', dismissNba);
router.post('/:id/outcomes', recordNbaOutcome);
router.post('/:nbaId/outcomes', recordNbaOutcome);

// NBA Outreach Routes
router.post('/:id/outreach/draft', generateDraft);
router.post('/:id/outreach', saveOutreach);
router.get('/:id/outreach', getLatestOutreach);

// Direct Outreach Actions
export const outreachRouter = Router();
outreachRouter.use(authenticate);
outreachRouter.post('/:outreachId/approve', approveOutreach);
outreachRouter.post('/:outreachId/activities', recordContactActivity);
outreachRouter.get('/:outreachId/activities', getContactActivities);

export default router;
