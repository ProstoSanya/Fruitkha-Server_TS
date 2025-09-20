import {DataTypes, Model, Optional, Transaction} from 'sequelize';
import sequelize from '../db';
import {toSlug} from '../utils/slug';


export interface TypeAttrs { id: number; name: string; }
export interface CountryAttrs { id: number; name: string; }
export interface ProductAttrs { id: number; name: string; alias: string; typeId: number; countryId: number; price: number; description?: string; image?: string; }
export interface OrderAttrs { id: number; name: string; email: string; address: string; phone: string; comment?: string; status: 'NEW' | 'IN_PROCESS' | 'EXECUTED' | 'REJECTED'; totalPrice: number; }
export interface OrderProductAttrs { id: number; orderId: number; productId: number; count: number; }
export interface UserAttrs { id: number; username: string; email: string; password: string; role: 'ADMIN' | 'USER'; }


type Creation<T extends { id?: unknown }> = Optional<T, 'id'>;

export type TypeAttrsCreation = Creation<TypeAttrs>;
export type CountryAttrsCreation = Creation<CountryAttrs>;
export type ProductAttrsCreation = Creation<ProductAttrs>;
export type OrderAttrsCreation = Creation<OrderAttrs>;
export type OrderProductAttrsCreation = Creation<OrderProductAttrs>;
export type UserAttrsCreation = Creation<UserAttrs>;


export class TypeModel extends Model<TypeAttrs, TypeAttrsCreation> implements TypeAttrs { id!: number; name!: string; };
export class CountryModel extends Model<CountryAttrs, CountryAttrsCreation> implements CountryAttrs { id!: number; name!: string; };
export class ProductModel extends Model<ProductAttrs, ProductAttrsCreation> implements ProductAttrs {
  id!: number;
  name!: string;
  alias!: string;
  typeId!: number;
  countryId!: number;
  price!: number;
  description?: string | undefined;
  image?: string | undefined;
  
  static async generateUniqueAlias(
    baseNameOrAlias: string,
    t?: Transaction,
    maxLen = 120
  ): Promise<string> {
    const base = toSlug(baseNameOrAlias, maxLen);
    let candidate = base;
    let counter = 1;

    const exists = await ProductModel.findOne({ where: { alias: candidate }, transaction: t });
    if (!exists) return candidate;

    while (true) {
      counter += 1;
      candidate = `${base}-${counter}`;
      if (candidate.length > maxLen) candidate = candidate.slice(0, maxLen);
      const clash = await ProductModel.findOne({ where: { alias: candidate }, transaction: t });
      if (!clash) return candidate;
    }
  }
};
export class OrderModel extends Model<OrderAttrs, OrderAttrsCreation> implements OrderAttrs { id!: number; name!: string; email!: string; address!: string; phone!: string; comment?: string | undefined; status!: 'NEW' | 'IN_PROCESS' | 'EXECUTED' | 'REJECTED'; totalPrice!: number; };
export class OrderProductModel extends Model<OrderProductAttrs, OrderProductAttrsCreation> implements OrderProductAttrs { id!: number; orderId!: number; productId!: number; count!: number; };
export class UserModel extends Model<UserAttrs, UserAttrsCreation> implements UserAttrs { id!: number; username!: string; email!: string; password!: string; role!: 'ADMIN' | 'USER'; };


TypeModel.init({ id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, name: { type: DataTypes.STRING, allowNull: false, unique: true } }, { sequelize, tableName: 'types', timestamps: false });
CountryModel.init({ id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, name: { type: DataTypes.STRING, allowNull: false, unique: true } }, { sequelize, tableName: 'countries', timestamps: false });
ProductModel.init({ id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, name: { type: DataTypes.STRING, allowNull: false, unique: true }, alias: { type: DataTypes.STRING, allowNull: false, unique: true }, typeId: { type: DataTypes.INTEGER, allowNull: false }, countryId: { type: DataTypes.INTEGER, allowNull: false }, price: { type: DataTypes.INTEGER, allowNull: false }, description: { type: DataTypes.STRING }, image: { type: DataTypes.STRING } }, { sequelize, tableName: 'products' });
OrderModel.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true } },
  address: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING, allowNull: false },
  comment: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'NEW', validate: { isIn: [['NEW', 'IN_PROCESS', 'EXECUTED', 'REJECTED']] } },
  totalPrice: { type: DataTypes.INTEGER, allowNull: false }
}, { sequelize, tableName: 'orders' });
OrderProductModel.init({ id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, orderId: { type: DataTypes.INTEGER, allowNull: false }, productId: { type: DataTypes.INTEGER, allowNull: false }, count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 } }, { sequelize, tableName: 'order_products' });
UserModel.init({ id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, username: { type: DataTypes.STRING, allowNull: false, unique: true }, email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } }, password: { type: DataTypes.STRING, allowNull: false }, role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USER', validate: { isIn: [['ADMIN', 'USER']] } } }, { sequelize, tableName: 'users', timestamps: false });


TypeModel.hasMany(ProductModel, { foreignKey: 'typeId', as: 'products' });
ProductModel.belongsTo(TypeModel, { foreignKey: 'typeId', as: 'type' });
CountryModel.hasMany(ProductModel, { foreignKey: 'countryId', as: 'products' });
ProductModel.belongsTo(CountryModel, { foreignKey: 'countryId', as: 'country' });
ProductModel.belongsToMany(OrderModel, { through: OrderProductModel, foreignKey: 'productId', as: 'orders' });
OrderModel.belongsToMany(ProductModel, { through: OrderProductModel, foreignKey: 'orderId', as: 'products' });


ProductModel.beforeValidate(async (product, options) => {
  if (!product.alias && product.name) {
    product.alias = toSlug(product.name);
  }
});

ProductModel.beforeCreate(async (product, options) => {
  if (product.alias) {
    const normalized = toSlug(product.alias);
    if (normalized !== product.alias) product.alias = normalized;
    product.alias = await ProductModel.generateUniqueAlias(product.alias, options.transaction || undefined);
  } else if (product.name) {
    product.alias = await ProductModel.generateUniqueAlias(product.name, options.transaction || undefined);
  }
});

export const Product = ProductModel;
export const Type = TypeModel;
export const Country = CountryModel;
export const Order = OrderModel;
export const OrderProduct = OrderProductModel;
export const User = UserModel;