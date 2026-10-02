import { Op } from 'sequelize';
import { AuditLog, Usuario } from '../models/index.js';

/**
 * Consulta del historial de auditoría
 * GET /api/admin/auditoria
 * EXCLUSIVO para rol 'admin'
 */
export const listarAuditoria = async (req, res, next) => {
  try {
    const {
      usuario_id,
      entidad,
      accion,
      fecha_desde,
      fecha_hasta,
      pagina = 1,
      limite = 20,
    } = req.query;

    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const limit = Math.max(1, parseInt(limite, 10) || 20);
    const offset = (page - 1) * limit;

    const where = {};

    if (usuario_id) {
      where.usuario_id = parseInt(usuario_id, 10);
    }

    if (entidad && entidad.trim() !== '') {
      where.entidad = {
        [Op.iLike]: `%${entidad.trim()}%`,
      };
    }

    if (accion && accion.trim() !== '') {
      where.accion = accion.trim();
    }

    if (fecha_desde || fecha_hasta) {
      where.created_at = {};
      if (fecha_desde) {
        const d = new Date(fecha_desde);
        d.setHours(0, 0, 0, 0);
        where.created_at[Op.gte] = d;
      }
      if (fecha_hasta) {
        const h = new Date(fecha_hasta);
        h.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = h;
      }
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre_completo', 'email', 'rol'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return res.status(200).json({
      error: false,
      total: count,
      pagina: page,
      limite: limit,
      total_paginas: Math.ceil(count / limit),
      logs: rows,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  listarAuditoria,
};
