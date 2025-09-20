import {Request, Response, NextFunction} from 'express';
import {Country, Product} from '../models/models';
import ApiError from '../error/ApiError';

const countryController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const name = String(req.body.name || '').trim();
      const country = await Country.create({name} as any);
      return res.json(country);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },
  async getAll(req: Request, res: Response) {
    let countries: any = {};
    if (req.query.involved) {
      const distinct = await Product.aggregate('countryId', 'DISTINCT', {plain: false} as any);
      if (Array.isArray(distinct) && distinct.length) {
        const ids: number[] = distinct
		  .map((d: unknown) => {
            return typeof d === 'object' && d !== null && 'DISTINCT' in d && typeof d.DISTINCT === 'number' ? d.DISTINCT : null;
          })
		  .filter((d) => d !== null);
        countries = await Country.findAll({where: {id: ids}});
        return res.json(countries);
      }
    }
    countries = await Country.findAll();
    return res.json(countries);
  }
};

export default countryController;