import {Request, Response, NextFunction} from 'express';
import {Op} from 'sequelize';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {User, UserAttrsCreation} from '../models/models';
import {verifyToken} from '../middleware/authMiddleware';
import ApiError from '../error/ApiError';

const userController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      let {username, email, password, role} = req.body as any;
      if (!username || !email || !password) {
        throw new Error('Please provide all the details');
      }
      const queryResult = await User.findOne({where: {[Op.or]: {email, username} as any}});
      if (queryResult?.dataValues) {
        throw new Error('This user already exists');
      }
      const params: UserAttrsCreation = {
        username,
        email,
        password: bcrypt.hashSync(password, 6),
        role: String(role || '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER'
      };
      const user = await User.create(params);
      return res.json(user);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        throw new Error('Not valid ID');
      }
      const user = await User.findOne({where: {id}});
      return res.json(user);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },
  async signin(req: Request, res: Response, next: NextFunction) {
    try {
      const {username, email, password} = req.body as any;
      if ((!username && !email) || !password) {
        throw new Error('Not all data is provided');
      }
      const obj: {username?: string; email?: string;} = {};
      if (username) {
        obj.username = username;
      }
      if (email) {
        obj.email = email;
      }
      const user = await User.findOne({where: {[Op.or]: obj, role: 'ADMIN'} as any});
      if (!user) {
        throw new Error('User not found');
      }
      if (!bcrypt.compareSync(password, user.password)) {
        throw new Error('Incorrect password');
      }
      const expiredAt = Math.floor(Date.now() / 1000) + 60 * 60 * 6;
      const data = {id: user.id, username: user.username, exp: expiredAt};
      const token = jwt.sign(data, process.env.TOKEN_SECRET as string);
	  
      return res.json({...data, token});
    } catch (err: unknown) {
      return next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
	  const {token} = req.body;
      if (!token) {
        return next(ApiError.unauthorized('Token not specified'));
      }
	  const {decoded} = verifyToken(token);
      if (!decoded) {
        return next(ApiError.unauthorized('Invalid token'));
      }
	  
	  const expiredAt = Math.floor(Date.now() / 1000) + 60 * 60 * 6;
      const data = {id: decoded.id, username: decoded.username, exp: expiredAt};
      const newToken = jwt.sign(data, process.env.TOKEN_SECRET as string);
	
      return res.json({token: newToken});
    } catch (err: unknown) {
      return next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  }
};

export default userController;
