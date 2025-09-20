import {Sequelize} from 'sequelize';

const args: [string, string, string, {dialect: 'postgres'; host?: string; port?: number; logging?: boolean}] =
  process.env.NODE_ENV === 'test'
    ? [
        process.env.DB_TEST_NAME || '',
        process.env.DB_TEST_USER || '',
        process.env.DB_TEST_PASS || '',
        {dialect: 'postgres', host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432, logging: false}
      ]
    : [
        process.env.DB_NAME || '',
        process.env.DB_USER || '',
        process.env.DB_PASS || '',
        {dialect: 'postgres', host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432, logging: false}
      ];

const sequelize = new Sequelize(...args);
export default sequelize;
