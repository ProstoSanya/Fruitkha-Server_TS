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

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((el) => el.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
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
