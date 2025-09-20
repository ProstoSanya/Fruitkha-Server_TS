import {Router} from 'express';
import orderController from '../controllers/orderController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.post('/', orderController.create);
router.put('/', authMiddleware, orderController.update);
router.get('/', authMiddleware, orderController.getAll);

export default router;