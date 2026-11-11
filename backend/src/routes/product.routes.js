import { Router } from 'express';
import { getProducts, getProductById } from '../controllers/product.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getProducts);
router.get('/:id', getProductById);

export default router;
