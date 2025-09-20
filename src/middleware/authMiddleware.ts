import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import ApiError from '../error/ApiError';

export const verifyToken = (token: string): {valid: boolean; expired: boolean; decoded: jwt.JwtPayload | null} => {
  let result: {valid: boolean; expired: boolean; decoded: jwt.JwtPayload | null};
  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET as string) as jwt.JwtPayload;	
    result = {valid: true, expired: false, decoded};
  } catch (err: unknown) {
	const expired = err instanceof jwt.TokenExpiredError;
    result = {valid: false, expired, decoded: null};
  }
  
  return result;
};

export default function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const bearerHeader = req.header('authorization');
    if (!bearerHeader) {
      return next(ApiError.unauthorized('Please provide a valid Authorization header')) as unknown as void;
    }
    const token = bearerHeader.split(' ')[1];
    const {valid, expired} = verifyToken(token);
    if (expired) {
      return next(ApiError.unauthorized('The token has expired')) as unknown as void;
    }
    if (!valid) {
      return next(ApiError.unauthorized('Token is not valid')) as unknown as void;
    }
    next();
  } catch (err: unknown) {
      return next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
};
