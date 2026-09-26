import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';
import errorHandler from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// Ruta raíz de bienvenida y mapa de la API
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    mensaje: 'Bienvenido a la API de El Chiringuito de Lukas 🐾',
    rutas_principales: {
      salud: 'GET /api/health',
      categorias: 'GET /api/categorias',
      productos: 'GET /api/productos',
      login: 'POST /api/auth/login',
      admin_productos: 'GET /api/admin/productos',
      admin_pedidos: 'GET /api/admin/pedidos',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Servidor de El Chiringuito de Lukas funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res, next) => {
  res.status(404).json({
    error: true,
    mensaje: 'Ruta no encontrada',
  });
});

app.use(errorHandler);

export default app;
