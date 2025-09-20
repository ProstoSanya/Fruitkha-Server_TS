import {Router} from 'express';
import shopController from '../controllers/shopController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, shopController.post);
router.get('/', shopController.getAll);
router.get('/:id', shopController.getOne);
router.get('/alias/:alias', shopController.getOneByAlias);
router.patch('/:id', authMiddleware, shopController.patch);
router.delete('/:id', authMiddleware, shopController.delete);

export default router;