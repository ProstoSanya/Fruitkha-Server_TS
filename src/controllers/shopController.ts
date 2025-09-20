import path from 'node:path';
import fs from 'node:fs';
import {v4 as uuidv4} from 'uuid';
import {Request, Response, NextFunction} from 'express';
import {FileArray, UploadedFile} from 'express-fileupload';
import {Op, WhereOptions, fn, col} from 'sequelize';
import {Product, ProductAttrsCreation, Type, Country} from '../models/models';
import sequelize from '../db';
import ApiError from '../error/ApiError';
import {toSlug} from '../utils/slug';

const getTypeId = async (type: string | number | undefined | null): Promise<number | null> => {
  if (!type) {
    return null;
  }
  let typeId = Number(type);
  if (!typeId || Number.isNaN(typeId)) {
    const queryResult = await Type.findOne({where: sequelize.where(fn('lower', col('name')), fn('lower', String(type))) as unknown as WhereOptions});
    if (!queryResult?.dataValues) {
      return null;
    }
    typeId = queryResult.dataValues.id;
  }
  return typeId;
};

const getCountryId = async (country: string | number | undefined | null): Promise<number | null> => {
  if (!country) {
    return null;
  }
  let countryId = Number(country);
  if (!countryId || Number.isNaN(countryId)) {
    const queryResult = await Country.findOne({where: sequelize.where(fn('lower', col('name')), fn('lower', String(country))) as unknown as WhereOptions});
    if (!queryResult?.dataValues) {
      return null;
    }
    countryId = queryResult.dataValues.id;
  }
  return countryId;
};

const getImagePath = (filename: string): string => path.resolve(__dirname, '..', '..', 'src', 'public', 'img', 'products', filename);

const unlinkImg = (filename: string): void => {
  const imgPath = getImagePath(filename);
  fs.exists(imgPath, isExist => {
    if (isExist) {
      fs.unlink(imgPath, err => { if (err) { console.log(err); } });
    }
  });
};

const shopController = {
  async post(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      let {name, type, country, price, description} = req.body as any;
      if (!name) {
        throw new Error('Product name not specified');
      }		
      const typeId = await getTypeId(type);
      if (!typeId) {
        throw new Error(`The specified type was not found (${type}).`);
      }		
      const countryId = await getCountryId(country);
      if (!countryId) {
        throw new Error(`The specified country was not found (${country}).`);
      }

      const newData: ProductAttrsCreation = {name, typeId, countryId, price: Number(price) || 0, alias: toSlug(String(name || ''))};
      if (description) {
        newData.description = description;
      }		
      const product = await Product.create(newData);
		
      const files = req.files as FileArray | undefined;
      if (files && 'image' in files) {
        const image = files.image as UploadedFile | UploadedFile[];
        const file = Array.isArray(image) ? image[0] : image;
        if (file && file.mimetype.split('/')[0] === 'image') {
          const fileName = uuidv4() + path.extname(file.name);
          await file.mv(getImagePath(fileName));
          product.image = fileName;
          await product.save();
        }
      }
      return res.json(product);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },
  
  
  async patch(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      let id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        throw new Error('Not valid ID');
      }
      id = Number(id);
      const product = await Product.findOne({where: {id}});
      if (!product) {
        throw new Error(`Record with ID ${id} not found`);
      }
	  
      const {name, type, country, description, clearImg} = req.body as any;
      const newData: Record<string, any> = {};
      if (name) {
        newData.name = name;
      }
      if (description) {
        newData.description = description;
      }
      if (type) {
        const typeId = await getTypeId(type);
	    if (!typeId) {
          throw new Error(`The specified type (${type}) was not found`);
        }
        newData.typeId = typeId;
      }
      if (country) {
        const countryId = await getCountryId(country);
        if (!countryId) {
          throw new Error(`The specified country (${country}) was not found`);
        }
        newData.countryId = countryId;
      }
      if ('price' in req.body) {
        newData.price = Number(req.body.price) || 0;
      }
      if (clearImg && product.image) {
        unlinkImg(product.image);
        newData.image = '';
      }
      if (Object.keys(newData).length) {
        product.set(newData);
        await product.save();
      }
		
      const files = req.files as FileArray | undefined;
      if (files && 'image' in files) {
        const image = files.image as UploadedFile | UploadedFile[];
        const file = Array.isArray(image) ? image[0] : image;
        if (file && file.mimetype.split('/')[0] === 'image') {
          if (product.image) {
            unlinkImg(product.image);
          }
          const fileName = uuidv4() + path.extname(file.name);
          await file.mv(getImagePath(fileName));
          product.image = fileName;
          await product.save();
        }
      }
      return res.json(product);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      let {type, country, page, limit, skip, random} = req.query as any;
      const options: Record<string, any> = {};
      options.order = random ? sequelize.random() : [['createdAt', 'DESC']];
      limit = Number(limit) || 0;
      page = Number(page) || 1;
      if (!limit && page > 1) {
        limit = 6;
      }
      if (limit) {
        options.limit = limit;
        options.offset = page * limit - limit;
      }
      const typeId = await getTypeId(type);
      const countryId = await getCountryId(country);
      if (typeId && countryId) {
        options.where = {typeId, countryId};
      }
      else if (typeId && !countryId) {
        options.where = {typeId};
      }
      else if (!typeId && countryId) {
        options.where = {countryId};
      }
      if (skip) {
        if (!Array.isArray(skip)) {
          skip = String(skip).split(',');
        }
        skip = skip.filter((id: unknown) => Number(id));
        if (skip.length) {
          options.where = options.where || {};
          options.where.id = {[Op.notIn]: skip};
        }
      }
      const data = await Product.findAndCountAll(options);
      return res.json(data);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        return next(ApiError.notFound('Not valid ID'));
      }
      const product = await Product.findOne({
        where: {id},
        include: [{model: Type, as: 'type'}, {model: Country, as: 'country'}]
      });
      if (!product) {
        return next(ApiError.notFound(`No product found with the specified ID (${id})`));
      }
      return res.json(product);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },

  async getOneByAlias(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const alias = String(req.params.alias).toLowerCase().trim();
      if (!alias) {
        return next(ApiError.notFound('Not valid alias'));
      }
      const product = await Product.findOne({
        where: {alias},
        include: [{model: Type, as: 'type'}, {model: Country, as: 'country'}]
      });
      if (!product) {
        return next(ApiError.notFound(`No product found with the specified alias (${alias})`));
      }
      return res.json(product);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        throw new Error('Not valid ID');
      }
      const product = await Product.findOne({ where: { id } });
      if (!product) {
        throw new Error(`Не найден товар с указанным ID (${id}).`);
      }
      if (product.image) {
        unlinkImg(product.image);
      }
      await product.destroy();
      return res.json({deleted: 'deleted'});
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  }
};

export default shopController;