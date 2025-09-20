import { Router } from 'express';
import shopRouter from './shopRouter';
import typeRouter from './typeRouter';
import countryRouter from './countryRouter';
import userRouter from './userRouter';
import orderRouter from './orderRouter';

const router = Router();
router.use('/shop', shopRouter);
router.use('/type', typeRouter);
router.use('/country', countryRouter);
router.use('/user', userRouter);
router.use('/order', orderRouter);
export default router;
