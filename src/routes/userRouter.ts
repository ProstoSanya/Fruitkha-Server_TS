import {Router} from 'express';
import userController from '../controllers/userController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, userController.create);
router.post('/signin', userController.signin);
router.post('/refresh', userController.refresh);
router.get('/:id', userController.getOne);

export default router;
