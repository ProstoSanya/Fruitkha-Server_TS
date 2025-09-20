import { Request, Response, NextFunction } from 'express';
import ApiError from '../error/ApiError';

export default function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): Response<any> {
  const e = err as Error;
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }
  return res.status(500).json({ message: e?.message || 'Непредвиденная ошибка!' });
}
