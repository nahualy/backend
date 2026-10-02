import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { Usuario } from '../models/index.js';
import { enviarCorreo } from '../services/email.service.js';

/**
 * 1. Crear usuario con rol 'personal'
 * POST /api/admin/usuarios
 * SOLO accesible por rol 'admin'. NUNCA crea otro 'admin'.
 */
export const crearUsuarioPersonal = async (req, res, next) => {
  try {
    const { nombre_completo, email, password } = req.body;

    if (!nombre_completo || !email || !password) {
      return res.status(400).json({
        error: true,
        mensaje: 'nombre_completo, email y password son obligatorios',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: true,
        mensaje: 'La contraseña temporal debe tener al menos 8 caracteres',
      });
    }

    const emailNormalizado = email.trim().toLowerCase();

    // Validar que el email no esté ya registrado
    const usuarioExistente = await Usuario.findOne({
      where: { email: emailNormalizado },
    });

    if (usuarioExistente) {
      return res.status(400).json({
        error: true,
        mensaje: 'El correo electrónico ya está registrado',
      });
    }

    // Hashear password con saltRounds 10
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // REGLA CRÍTICA: rol SIEMPRE es 'personal' fijado en código
    const nuevoUsuario = await Usuario.create({
      nombre_completo: nombre_completo.trim(),
      email: emailNormalizado,
      password_hash,
      rol: 'personal',
      activo: true,
      debe_cambiar_password: true,
    });

    // Enviar correo de bienvenida (si falla, NO aborta la creación)
    let correo_bienvenida_enviado = false;
    try {
      const asunto = 'Bienvenido/a a El Chiringuito de Lukas';
      const mensajeHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2c3e50;">¡Bienvenido/a al equipo de El Chiringuito de Lukas! 🐾</h2>
          <p>Hola <strong>${nuevoUsuario.nombre_completo}</strong>,</p>
          <p>Se ha creado tu cuenta de acceso como personal del sistema. A continuación encontrarás tus credenciales temporales de acceso:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Correo:</strong> ${nuevoUsuario.email}</p>
            <p style="margin: 5px 0;"><strong>Contraseña temporal:</strong> ${password}</p>
          </div>
          <p style="color: #c0392b; font-weight: bold;">
            ⚠️ Por motivos de seguridad, deberás cambiar esta contraseña la primera vez que inicies sesión.
          </p>
          <p style="color: #7f8c8d; font-size: 13px;">Si tienes alguna duda, comunícate con el administrador del sistema.</p>
        </div>
      `;

      const resultadoEnvio = await enviarCorreo(emailNormalizado, asunto, mensajeHtml);
      correo_bienvenida_enviado = resultadoEnvio?.exito === true;
    } catch (errCorreo) {
      console.warn('⚠️ No se pudo enviar el correo de bienvenida al nuevo usuario:', errCorreo.message);
      correo_bienvenida_enviado = false;
    }

    return res.status(201).json({
      error: false,
      mensaje: 'Usuario de personal creado con éxito',
      usuario: {
        id: nuevoUsuario.id,
        nombre_completo: nuevoUsuario.nombre_completo,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        activo: nuevoUsuario.activo,
        debe_cambiar_password: nuevoUsuario.debe_cambiar_password,
        created_at: nuevoUsuario.createdAt || nuevoUsuario.created_at,
      },
      correo_bienvenida_enviado,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Listar usuarios (admin y personal)
 * GET /api/admin/usuarios
 * Paginado con filtro opcional de estado ('activos', 'inactivos', 'todos')
 * NUNCA incluye password_hash.
 */
export const listarUsuarios = async (req, res, next) => {
  try {
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const limite = Math.max(1, parseInt(req.query.limite, 10) || 10);
    const offset = (pagina - 1) * limite;
    const estado = req.query.estado || 'todos';

    const where = {};
    if (estado === 'activos') {
      where.activo = true;
    } else if (estado === 'inactivos') {
      where.activo = false;
    }

    const { count, rows } = await Usuario.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['id', 'ASC']],
      limit: limite,
      offset,
    });

    return res.status(200).json({
      error: false,
      total: count,
      pagina,
      limite,
      total_paginas: Math.ceil(count / limite),
      usuarios: rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Actualizar usuario personal
 * PUT /api/admin/usuarios/:id
 * BLOQUEA la edición si el usuario objetivo es 'admin'.
 */
export const actualizarUsuarioPersonal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre_completo, email } = req.body;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        error: true,
        mensaje: 'Usuario no encontrado',
      });
    }

    // REGLA CRÍTICA: Bloquear si es el administrador
    if (usuario.rol === 'admin') {
      return res.status(403).json({
        error: true,
        mensaje: 'No se puede modificar la cuenta de administrador desde este endpoint',
      });
    }

    if (nombre_completo) {
      usuario.nombre_completo = nombre_completo.trim();
    }

    if (email) {
      const emailNormalizado = email.trim().toLowerCase();
      if (emailNormalizado !== usuario.email) {
        const emailEnUso = await Usuario.findOne({
          where: {
            email: emailNormalizado,
            id: { [Op.ne]: id },
          },
        });

        if (emailEnUso) {
          return res.status(400).json({
            error: true,
            mensaje: 'El correo electrónico ya está registrado por otro usuario',
          });
        }

        usuario.email = emailNormalizado;
      }
    }

    await usuario.save();

    return res.status(200).json({
      error: false,
      mensaje: 'Usuario actualizado con éxito',
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
        debe_cambiar_password: usuario.debe_cambiar_password,
        updated_at: usuario.updatedAt || usuario.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Desactivar usuario (Soft delete)
 * DELETE /api/admin/usuarios/:id
 * BLOQUEA si el usuario objetivo es 'admin'.
 */
export const desactivarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        error: true,
        mensaje: 'Usuario no encontrado',
      });
    }

    // REGLA CRÍTICA: Bloquear si es el administrador
    if (usuario.rol === 'admin') {
      return res.status(403).json({
        error: true,
        mensaje: 'No se puede desactivar la cuenta de administrador',
      });
    }

    usuario.activo = false;
    await usuario.save();

    return res.status(200).json({
      error: false,
      mensaje: 'Usuario desactivado con éxito',
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Reactivar usuario
 * PUT /api/admin/usuarios/:id/reactivar
 * Pone activo = true de nuevo para un usuario previamente desactivado.
 */
export const reactivarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        error: true,
        mensaje: 'Usuario no encontrado',
      });
    }

    if (usuario.rol === 'admin') {
      return res.status(400).json({
        error: true,
        mensaje: 'La cuenta de administrador siempre está activa',
      });
    }

    usuario.activo = true;
    await usuario.save();

    return res.status(200).json({
      error: false,
      mensaje: 'Usuario reactivado con éxito',
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  crearUsuarioPersonal,
  listarUsuarios,
  actualizarUsuarioPersonal,
  desactivarUsuario,
  reactivarUsuario,
};
