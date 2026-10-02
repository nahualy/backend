import bcrypt from 'bcrypt';
import { Usuario } from '../models/index.js';

/**
 * 1. Ver perfil del usuario autenticado
 * GET /api/admin/perfil
 * Accesible por CUALQUIER usuario autenticado (admin o personal) sobre su propia cuenta.
 */
export const verPerfil = async (req, res, next) => {
  try {
    const usuarioId = req.usuario?.id;

    if (!usuarioId) {
      return res.status(401).json({
        error: true,
        mensaje: 'Usuario no autenticado',
      });
    }

    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: { exclude: ['password_hash'] },
    });

    if (!usuario) {
      return res.status(404).json({
        error: true,
        mensaje: 'Usuario no encontrado',
      });
    }

    return res.status(200).json({
      error: false,
      usuario,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Cambiar contraseña de la propia cuenta
 * PUT /api/admin/perfil/password
 * Accesible por CUALQUIER usuario autenticado (admin o personal).
 */
export const cambiarPassword = async (req, res, next) => {
  try {
    const usuarioId = req.usuario?.id;
    const { password_actual, password_nuevo } = req.body;

    if (!usuarioId) {
      return res.status(401).json({
        error: true,
        mensaje: 'Usuario no autenticado',
      });
    }

    if (!password_actual || !password_nuevo) {
      return res.status(400).json({
        error: true,
        mensaje: 'password_actual y password_nuevo son obligatorios',
      });
    }

    if (password_nuevo.length < 8) {
      return res.status(400).json({
        error: true,
        mensaje: 'La nueva contraseña debe tener al menos 8 caracteres',
      });
    }

    const usuario = await Usuario.findByPk(usuarioId);

    if (!usuario) {
      return res.status(404).json({
        error: true,
        mensaje: 'Usuario no encontrado',
      });
    }

    // Verificar contraseña actual con bcrypt.compare
    const passwordValido = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({
        error: true,
        mensaje: 'La contraseña actual es incorrecta',
      });
    }

    // Hashear nueva contraseña con saltRounds 10
    const saltRounds = 10;
    const nuevoHash = await bcrypt.hash(password_nuevo, saltRounds);

    usuario.password_hash = nuevoHash;
    usuario.debe_cambiar_password = false;
    await usuario.save();

    return res.status(200).json({
      error: false,
      mensaje: 'Contraseña actualizada con éxito',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  verPerfil,
  cambiarPassword,
};
