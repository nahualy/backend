import rateLimit from 'express-rate-limit';

/**
 * Limitador general para toda la API (/api/*)
 * Máximo 100 peticiones por IP cada 15 minutos.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 100, // Máximo 100 peticiones por ventana
  standardHeaders: true, // Devuelve headers `RateLimit-*` (RFC standard)
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*` obsoletos
  message: {
    error: true,
    mensaje: 'Demasiadas peticiones desde esta IP. Intenta de nuevo en unos minutos.',
  },
});

/**
 * Limitador estricto para el inicio de sesión (POST /api/auth/login)
 * Protección contra ataques de fuerza bruta.
 * Máximo 5 intentos por IP cada 15 minutos.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 5, // Máximo 5 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    mensaje: 'Demasiados intentos de inicio de sesión. Por seguridad, espera 15 minutos antes de volver a intentarlo.',
  },
});

export default {
  generalLimiter,
  loginLimiter,
};
