import { Router } from 'express';
import countryController from '../controllers/countryController';

const router = Router();
router.post('/', countryController.create);
router.get('/', countryController.getAll);
export default router;