import { Router } from 'express';
import {
  getTeamLeadDashboard,
  getTeamRms,
  getTeamOutcomes,
} from '../controllers/teamLead.controller.js';
import { assignClientRm } from '../controllers/client.controller.js';
import { authenticate, authorizeRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorizeRole(['TEAM_LEAD']));

router.get('/dashboard', getTeamLeadDashboard);
router.get('/rms', getTeamRms);
router.get('/outcomes', getTeamOutcomes);
router.patch('/clients/:id/assign', assignClientRm);

export default router;
