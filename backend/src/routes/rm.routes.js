import { Router } from 'express';
import { getRmDashboard, getRmOutcomes, recordNbaOutcome, triggerSignalEvaluation } from '../controllers/rm.controller.js';
import { authenticate, authorizeRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorizeRole(['RM']));

router.get('/dashboard', getRmDashboard);
router.get('/outcomes', getRmOutcomes);
router.post('/nbas/:id/outcomes', recordNbaOutcome);
router.post('/nbas/:nbaId/outcomes', recordNbaOutcome);
router.post('/evaluate-signals', triggerSignalEvaluation);

export default router;
