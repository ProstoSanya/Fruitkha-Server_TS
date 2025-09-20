import 'dotenv/config';
import path from 'node:path';
import express, {Application} from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import sequelize from './db';
import router from './routes';
import errorHandler from './middleware/ErrorHandlingMiddleware';

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '127.0.0.1';

const app: Application = express();

const allowedOrigins = [
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://fruitkha.shop',
  'https://www.fruitkha.shop'
];
app.use(cors({
  origin(origin, cb) {
    console.log('\r\n >>> Origin:', origin); ///  || allowedOrigins.find((allowed) => origin.indexOf(allowed) === 0)
    if (!origin || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.resolve(__dirname, '..', 'src', 'public')));
app.use(fileUpload({}));
app.use('/api', router);
app.use(errorHandler);

const start = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(PORT, HOST, () => console.log(`Server listens http://${HOST}:${PORT}`));
  } catch (err) {
    console.log(err);
  }
};

start();
export default app;
