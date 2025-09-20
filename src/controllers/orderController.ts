import {Request, Response, NextFunction} from 'express';
import {Op} from 'sequelize';
import {Order, OrderAttrsCreation, OrderProduct, Product, Country, Type} from '../models/models';
import ApiError from '../error/ApiError';

type OrderCreationPayloadProduct = {
  productId: number;
  name: string;
  count: number;
};

type OrderCreationPayload = {
  name: string;
  phone: string;
  email: string;
  address: string;
  comment?: string;
  totalPrice: number;
  products: OrderCreationPayloadProduct[];
};

type Validator<T> = (value: T) => string | null;

type RequiredKeys<T> = { [K in keyof T]-?: undefined extends T[K] ? never : K }[keyof T];
type OptionalKeys<T> = { [K in keyof T]-?: undefined extends T[K] ? K : never }[keyof T];

type ValidationRules<T> =
  { [K in RequiredKeys<T>]-?: Validator<NonNullable<T[K]>>[] } &
  { [K in OptionalKeys<T>]?: Validator<NonNullable<T[K]>>[] };

function typedEntries<R extends object>(obj: R) {
  return Object.entries(obj) as {
    [K in keyof R]-?: [K, R[K]]
  }[keyof R][];
}

function validateEntry<
  T,
  K extends keyof ValidationRules<T>
>(
  data: T,
  entry: readonly [K, ValidationRules<T>[K]]
) {
  const [key, validators] = entry;
  if (!validators) return;
  const raw = (data as any)[key as any];
  if (raw == null) return;

  type V = ValidationRules<T>[K] extends readonly Validator<infer U>[] ? U : never;

  for (const v of validators as readonly Validator<V>[]) {
    const msg = v(raw as V);
    if (msg) throw new Error(msg);
  }
}

const validationRules = {
  name: [
    (value) => value.trim().length < 4 ? 'The name must consist of at least 4 characters' : null
  ],
  phone: [
    (value) => !value.trim().length ? 'You must provide a phone number' : null,
    (value) => !value.match(/^\+?(?:\D*\d){7,15}\D*$/) ? 'The phone is not valid' : null
  ],
  email: [
    (value) => !value.trim().length ? 'You must provide an email address' : null,
    (value) => !value.match(/^(?!.*\.\.)[A-Z0-9._%+-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,}$/i) ? 'The email is not valid' : null
  ],
  address: [
    (value) => value.trim().length < 6 ? 'The address must consist of at least 6 characters' : null
  ],
  comment: [
    (value) => value.trim().length > 150 ? 'The value of the comment field is too long' : null
  ],
  totalPrice: [
    (value) => value <= 0 ? 'Not valid total price' : null
  ],
  products: [
    (value) => Array.isArray(value) && value.every((p) => isObject(p) && Object.keys(p).length === 2 && 'productId' in p && 'count' in p) ? '' : null
  ]
} satisfies ValidationRules<OrderCreationPayload>;

const isObject = (obj: unknown): obj is Record<string, unknown> => obj !== null && typeof obj === 'object' && !Array.isArray(obj);

const isProductsArray = (
  v: unknown
): v is { productId: number; count: number }[] => {
  if (!Array.isArray(v)) return false;
  for (const p of v) {
    if (!isObject(p)) return false;
    const { productId, count } = p;
    if (typeof productId !== 'number' || !Number.isFinite(productId)) return false;
    if (typeof count !== 'number' || !Number.isFinite(count)) return false;
  }
  return true;
};

const isOrderCreationPayload = (v: unknown): v is OrderCreationPayload => {
  if (!isObject(v)) return false;

  const {
    name, phone, email, address, comment, totalPrice, products, ...rest
  } = v as Record<string, unknown>;

  if (Object.keys(rest).length) return false;

  if (typeof name !== 'string') return false;
  if (typeof phone !== 'string') return false;
  if (typeof email !== 'string') return false;
  if (typeof address !== 'string') return false;
  if (typeof totalPrice !== 'number') return false;
  if (comment !== undefined && typeof comment !== 'string') return false;
  if (!isProductsArray(products)) return false;

  return true;
};

function runValidators<T, K extends keyof T>(
  validators: readonly Validator<NonNullable<T[K]>>[],
  data: T,
  key: K
) {
  const raw = data[key];
  if (raw == null) return;
  const value = raw as NonNullable<T[K]>;
  for (const v of validators) {
    const msg = v(value);
    if (msg) throw new Error(msg);
  }
}

const orderController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orderData = req.body;
      if (!isOrderCreationPayload(orderData)) {
        throw new Error('Received not valid data');
      }
      for (const entry of typedEntries(validationRules)) {
        validateEntry(orderData, entry);
      }
    
      const {products} = orderData;
      let productIds: number[] = products.map(({productId}) => productId);
      if (!productIds.length) {
        throw new Error('Products are missing from the order');
      }
      if (productIds.filter((id, index) => productIds.indexOf(id) === index).length !== products.length) {
        throw new Error('There are duplicates in the list of products');
      }
      const productsFromDb = await Product.findAll({where: {id: {[Op.in]: productIds}}});
      let totalPrice = 0;
      for (const {productId, count} of products) {
        const product = productsFromDb.find(({id}) => productId === id);
        if (!product) {
          throw new Error(`Product with ID ${productId} not found`);
        }
        totalPrice += product.price * count;
      }
      if (orderData.totalPrice !== totalPrice) {
        throw new Error('Not valid order total price');
      }

      const order = await Order.create({...orderData, status: 'NEW'});
      await OrderProduct.bulkCreate(products.map((p) => ({orderId: order.id, ...p})));
      return res.json(order);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      let {id, status} = req.body || {};
      id = Number(id);
      if (!id || Number.isNaN(id)) {
        throw new Error('Not valid ID.');
      }
      if (!status) {
        throw new Error('Not valid status');
      }
      const order = await Order.findOne({where: {id}});
      if (!order) {
        throw new Error(`Order with ID ${id} not found`);
      }
      order.set({status});
      await order.save();
      return res.json(order);
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  },
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await Order.findAndCountAll({
        order: [['id', 'DESC']],
        distinct: true,
        subQuery: false,
        include:[
         {
            model: Product,
        as: 'products',
            attributes: ['id', 'name', 'alias', 'price', 'image'],
            through: {
              attributes: ['count']
            },
            include: [
              {model: Type, attributes: ['id', 'name'], as: 'type'},
              {model: Country, attributes: ['id', 'name'], as: 'country'},
            ]
          },
        ],
      });
    
      const rows = orders.rows.map((o) => {
        const plain = o.get({ plain: true });
        const products = ('products' in plain && Array.isArray(plain.products) ? plain.products : []).map((p: any) => ({
          ...p,
          count: p.OrderProductModel?.count
        }));
        products.forEach((p: any) => delete p.OrderProductModel);
        return {...plain, products};
      });
    
      return res.json({...orders, rows});
    } catch (err: unknown) {
      next(ApiError.badRequest(err instanceof Error ? err.message : 'Unknown error'));
    }
  }
};

export default orderController;