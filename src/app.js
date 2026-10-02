import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';
import errorHandler from './middlewares/error.middleware.js';
import { generalLimiter } from './middlewares/rateLimit.middleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Helmet: Cabeceras de seguridad HTTP por defecto
app.use(helmet());

// 2. CORS: Restringido al origen de frontend configurado (por defecto Vite en puerto 5173)
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: frontendUrl,
    credentials: false, // Usamos tokens JWT en Authorization header, no cookies
  })
);

// 3. Body Parsers y Archivos Estáticos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// 4. Rate Limiter General para todas las rutas /api/* (100 peticiones / 15 min por IP)
app.use('/api', generalLimiter);

// 5. Rutas de la aplicación
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

// Manejador de rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({
    error: true,
    mensaje: 'Ruta no encontrada',
  });
});

// 6. Middleware de manejo global de errores (siempre al final)
app.use(errorHandler);

export default app;
