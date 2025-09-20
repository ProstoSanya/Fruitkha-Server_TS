import {Request, Response, NextFunction} from 'express';
import {Type, Product} from '../models/models';
import ApiError from '../error/ApiError';

const typeController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const name = String(req.body.name || '').trim();
      const type = await Type.create({ name } as any);
      return res.json(type);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },
  async getAll(req: Request, res: Response) {
    let types: any = {};
    if (req.query.involved) {
      const distinct = await Product.aggregate('typeId', 'DISTINCT', {plain: false} as any);
      if (Array.isArray(distinct) && distinct.length) {
        const ids: number[] = distinct
		  .map((d: unknown) => {
            return typeof d === 'object' && d !== null && 'DISTINCT' in d && typeof d.DISTINCT === 'number' ? d.DISTINCT : null;
          })
		  .filter((d) => d !== null);
        types = await Type.findAll({ where: { id: ids } });
        return res.json(types);
      }
    }
    types = await Type.findAll();
    return res.json(types);
  }
};

export default typeController;