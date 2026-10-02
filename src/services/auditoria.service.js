import { AuditLog } from '../models/index.js';

/**
 * Sanitiza recursivamente un objeto o instancia para remover credenciales y datos sensibles
 * antes de almacenarlo en la bitácora de auditoría.
 */
export const sanitizarParaAuditoria = (obj) => {
  if (obj === null || obj === undefined) {
    return null;
  }

  // Extraer objeto plano si es una instancia Sequelize
  let data = typeof obj.toJSON === 'function' ? obj.toJSON() : obj;

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizarParaAuditoria(item));
  }

  // Clon superficial para no alterar el objeto original
  const sanitized = { ...data };

  // Campos sensibles prohibidos en auditoría
  const camposSensibles = [
    'password',
    'password_hash',
    'token',
    'refresh_token',
    'contrasena',
  ];

  for (const campo of camposSensibles) {
    if (campo in sanitized) {
      delete sanitized[campo];
    }
  }

  // Sanitizar recursivamente objetos anidados
  for (const key of Object.keys(sanitized)) {
    if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizarParaAuditoria(sanitized[key]);
    }
  }

  return sanitized;
};

/**
 * Registra una acción administrativa en la tabla audit_logs.
 * Protegido con try/catch interno: JAMÁS propaga errores ni interrumpe la operación principal.
 */
export const registrarAuditoria = async ({
  usuario_id = null,
  accion,
  entidad,
  entidad_id = null,
  datos_anteriores = null,
  datos_nuevos = null,
  descripcion = null,
  ip_origen = null,
}) => {
  try {
    const sanitizadoAnterior = sanitizarParaAuditoria(datos_anteriores);
    const sanitizadoNuevo = sanitizarParaAuditoria(datos_nuevos);

    const log = await AuditLog.create({
      usuario_id: usuario_id ? parseInt(usuario_id, 10) : null,
      accion: String(accion),
      entidad: String(entidad),
      entidad_id: entidad_id ? parseInt(entidad_id, 10) : null,
      datos_anteriores: sanitizadoAnterior,
      datos_nuevos: sanitizadoNuevo,
      descripcion: descripcion ? String(descripcion) : null,
      ip_origen: ip_origen ? String(ip_origen) : null,
    });

    return log;
  } catch (error) {
    console.warn('⚠️ [Auditoría] No se pudo registrar log de auditoría:', error.message);
    return null;
  }
};

export default {
  sanitizarParaAuditoria,
  registrarAuditoria,
};
