import { Router } from 'express';
import {
  getClients,
  getClientById,
  getClientHoldings,
  getClientSignals,
  getClientNbas,
  generateClientNbas,
  assignClientRm,
} from '../controllers/client.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getClients);
router.get('/:id', getClientById);
router.patch('/:id/assign', assignClientRm);
router.get('/:id/holdings', getClientHoldings);
router.get('/:id/signals', getClientSignals);
router.get('/:id/nbas', getClientNbas);
router.post('/:id/nbas/generate', generateClientNbas);

export default router;
