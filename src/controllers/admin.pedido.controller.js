import fs from 'fs';
import path from 'path';
import { sequelize, Pedido, DetallePedido, Pago, Producto, Usuario } from '../models/index.js';
import { devolverStockPedido } from '../services/pedido.service.js';
import { generarLinkWhatsApp } from '../utils/whatsapp.util.js';
import { enviarWhatsApp } from '../services/whatsapp.service.js';
import { enviarCorreo } from '../services/email.service.js';
import { generarNotaEntregaPDF } from '../services/notaEntrega.service.js';

export const getPedidosAdmin = async (req, res, next) => {
  try {
    const { pagina = 1, limite = 20, estado } = req.query;

    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const limit = Math.max(1, parseInt(limite, 10) || 20);
    const offset = (page - 1) * limit;

    const whereConditions = {};
    if (estado && estado.trim() !== '') {
      whereConditions.estado = estado.trim();
    }

    const { count, rows } = await Pedido.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: DetallePedido,
          as: 'detalles',
          attributes: ['id', 'cantidad', 'precio_unitario'],
        },
        {
          model: Pago,
          as: 'pagos',
          attributes: ['id', 'metodo', 'monto', 'estado', 'created_at'],
        },
      ],
      distinct: true,
    });

    const pedidosFormateados = rows.map((p) => {
      const pedidoJson = p.toJSON();
      const totalItems = (pedidoJson.detalles || []).reduce(
        (sum, item) => sum + item.cantidad,
        0
      );
      return {
        ...pedidoJson,
        total_items: totalItems,
      };
    });

    return res.status(200).json({
      error: false,
      total: count,
      pagina: page,
      totalPaginas: Math.ceil(count / limit),
      limite: limit,
      pedidos: pedidosFormateados,
    });
  } catch (error) {
    next(error);
  }
};

export const getPedidoByIdAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pedido = await Pedido.findByPk(id, {
      include: [
        {
          model: DetallePedido,
          as: 'detalles',
          include: [
            {
              model: Producto,
              as: 'producto',
              attributes: ['id', 'nombre', 'foto', 'precio'],
            },
          ],
        },
        {
          model: Pago,
          as: 'pagos',
          include: [
            {
              model: Usuario,
              as: 'verificador',
              attributes: ['id', 'nombre_completo', 'email'],
            },
          ],
        },
      ],
      order: [[{ model: Pago, as: 'pagos' }, 'created_at', 'ASC']],
    });

    if (!pedido) {
      return res.status(404).json({
        error: true,
        mensaje: 'Pedido no encontrado',
      });
    }

    return res.status(200).json({
      error: false,
      pedido,
    });
  } catch (error) {
    next(error);
  }
};

export const getPagosPendientes = async (req, res, next) => {
  try {
    const pagosPendientes = await Pago.findAll({
      where: { estado: 'pendiente' },
      include: [
        {
          model: Pedido,
          as: 'pedido',
          attributes: [
            'id',
            'nombre_cliente',
            'email_cliente',
            'telefono_cliente',
            'direccion_entrega',
            'total',
            'estado',
            'created_at',
          ],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    return res.status(200).json({
      error: false,
      total: pagosPendientes.length,
      pagos: pagosPendientes,
    });
  } catch (error) {
    next(error);
  }
};

export const aprobarPago = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pago = await Pago.findByPk(id, {
      include: [{ model: Pedido, as: 'pedido' }],
    });

    if (!pago) {
      return res.status(404).json({
        error: true,
        mensaje: 'Pago no encontrado',
      });
    }

    if (pago.estado !== 'pendiente') {
      return res.status(400).json({
        error: true,
        mensaje: `El pago ya fue revisado previamente y se encuentra en estado "${pago.estado}"`,
      });
    }

    const pedido = pago.pedido;
    if (!pedido) {
      return res.status(404).json({
        error: true,
        mensaje: 'Pedido asociado no encontrado',
      });
    }

    pago.estado = 'aprobado';
    pago.verificado_por = req.usuario.id;
    pago.fecha_verificacion = new Date();
    await pago.save();

    pedido.estado = 'confirmado';
    await pedido.save();

    const mensajeWhatsApp = `Hola ${pedido.nombre_cliente}, tu pago para el pedido #${pedido.id} fue APROBADO. Tu pedido está confirmado y pronto será procesado. ¡Gracias por tu compra en El Chiringuito de Lukas! 🐾`;
    const link_whatsapp = generarLinkWhatsApp(pedido.telefono_cliente, mensajeWhatsApp);

    let resWhatsApp = { exito: false };
    try {
      resWhatsApp = await enviarWhatsApp(pedido.telefono_cliente, mensajeWhatsApp);
    } catch (_) {}

    let resEmail = { exito: false };
    if (pedido.email_cliente) {
      try {
        const asunto = `¡Pago Aprobado! Tu pedido #${pedido.id} está confirmado - El Chiringuito de Lukas`;
        const html = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #2e7d32;">¡Pago Aprobado! 🎉</h2>
            <p>Hola <strong>${pedido.nombre_cliente}</strong>,</p>
            <p>Tu comprobante de pago para el pedido <strong>#${pedido.id}</strong> ha sido verificado y aprobado con éxito.</p>
            <p>Tu pedido ya se encuentra confirmado y pasará pronto a preparación.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.9em; color: #666;">Gracias por confiar en <strong>El Chiringuito de Lukas</strong> 🐾</p>
          </div>
        `;
        resEmail = await enviarCorreo(pedido.email_cliente, asunto, html);
      } catch (_) {}
    }

    return res.status(200).json({
      error: false,
      mensaje: 'Pago aprobado y pedido confirmado exitosamente',
      pago,
      pedido,
      whatsapp_enviado: Boolean(resWhatsApp.exito),
      correo_enviado: Boolean(resEmail.exito),
      link_whatsapp,
    });
  } catch (error) {
    next(error);
  }
};

export const rechazarPago = async (req, res, next) => {
  let transaction;
  try {
    const { id } = req.params;
    const { motivo_rechazo } = req.body;

    const MOTIVOS_VALIDOS = ['duplicado', 'monto_incorrecto', 'no_recibido', 'otro'];
    const motivoFinal = MOTIVOS_VALIDOS.includes(motivo_rechazo) ? motivo_rechazo : 'otro';

    const pago = await Pago.findByPk(id, {
      include: [{ model: Pedido, as: 'pedido' }],
    });

    if (!pago) {
      return res.status(404).json({
        error: true,
        mensaje: 'Pago no encontrado',
      });
    }

    if (pago.estado !== 'pendiente') {
      return res.status(400).json({
        error: true,
        mensaje: `El pago ya fue revisado previamente y se encuentra en estado "${pago.estado}"`,
      });
    }

    const pedido = pago.pedido;
    if (!pedido) {
      return res.status(404).json({
        error: true,
        mensaje: 'Pedido asociado no encontrado',
      });
    }

    pago.estado = 'rechazado';
    pago.motivo_rechazo = motivoFinal;
    pago.verificado_por = req.usuario.id;
    pago.fecha_verificacion = new Date();
    await pago.save();

    const rechazosTotales = await Pago.count({
      where: { pedido_id: pedido.id, estado: 'rechazado' },
    });

    let pedidoCancelado = false;
    let intentosRestantes = Math.max(0, 3 - rechazosTotales);
    let mensajeWhatsApp = '';

    if (rechazosTotales >= 3) {
      transaction = await sequelize.transaction();

      pedido.estado = 'cancelado';
      await pedido.save({ transaction });

      await devolverStockPedido(pedido.id, transaction);

      await transaction.commit();
      pedidoCancelado = true;

      mensajeWhatsApp = `Hola ${pedido.nombre_cliente}, lamentablemente tu pedido #${pedido.id} fue cancelado tras varios intentos de pago no válidos. Si deseas realizar el pedido nuevamente, contáctanos.`;
    } else {
      mensajeWhatsApp = `Hola ${pedido.nombre_cliente}, tu comprobante de pago para el pedido #${pedido.id} no pudo ser validado (motivo: ${motivoFinal}). Por favor envíanos un nuevo comprobante para continuar con tu pedido. Te quedan ${intentosRestantes} intento(s).`;
    }

    const link_whatsapp = generarLinkWhatsApp(pedido.telefono_cliente, mensajeWhatsApp);

    let resWhatsApp = { exito: false };
    try {
      resWhatsApp = await enviarWhatsApp(pedido.telefono_cliente, mensajeWhatsApp);
    } catch (_) {}

    let resEmail = { exito: false };
    if (pedido.email_cliente) {
      try {
        const asunto = pedidoCancelado
          ? `Pedido #${pedido.id} cancelado por intentos de pago agotados - El Chiringuito de Lukas`
          : `Comprobante de pago rechazado para el pedido #${pedido.id} - El Chiringuito de Lukas`;
        const html = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #c62828;">${pedidoCancelado ? 'Pedido Cancelado' : 'Comprobante no validado'}</h2>
            <p>Hola <strong>${pedido.nombre_cliente}</strong>,</p>
            <p>${mensajeWhatsApp}</p>
            <p><strong>Motivo:</strong> ${motivoFinal}</p>
            ${!pedidoCancelado ? `<p>Te quedan <strong>${intentosRestantes}</strong> intento(s) para subir un comprobante válido.</p>` : ''}
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.9em; color: #666;">El Chiringuito de Lukas 🐾</p>
          </div>
        `;
        resEmail = await enviarCorreo(pedido.email_cliente, asunto, html);
      } catch (_) {}
    }

    return res.status(200).json({
      error: false,
      mensaje: pedidoCancelado
        ? 'Pago rechazado. Se alcanzó el límite de 3 intentos; el pedido fue cancelado y el stock restablecido.'
        : `Pago rechazado. El pedido continúa pendiente con ${intentosRestantes} intento(s) restante(s).`,
      pago,
      pedido_cancelado: pedidoCancelado,
      intentos_restantes: intentosRestantes,
      whatsapp_enviado: Boolean(resWhatsApp.exito),
      correo_enviado: Boolean(resEmail.exito),
      link_whatsapp,
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (_) {}
    }
    next(error);
  }
};

export const cancelarPedido = async (req, res, next) => {
  let transaction;
  try {
    const { id } = req.params;

    const pedido = await Pedido.findByPk(id);
    if (!pedido) {
      return res.status(404).json({
        error: true,
        mensaje: 'Pedido no encontrado',
      });
    }

    if (pedido.estado === 'cancelado' || pedido.estado === 'entregado') {
      return res.status(400).json({
        error: true,
        mensaje: `No se puede cancelar un pedido en estado "${pedido.estado}"`,
      });
    }

    transaction = await sequelize.transaction();

    pedido.estado = 'cancelado';
    await pedido.save({ transaction });

    await devolverStockPedido(pedido.id, transaction);

    await transaction.commit();

    const mensajeWhatsApp = `Hola ${pedido.nombre_cliente}, tu pedido #${pedido.id} ha sido cancelado. Si tienes dudas, contáctanos.`;
    const link_whatsapp = generarLinkWhatsApp(pedido.telefono_cliente, mensajeWhatsApp);

    let resWhatsApp = { exito: false };
    try {
      resWhatsApp = await enviarWhatsApp(pedido.telefono_cliente, mensajeWhatsApp);
    } catch (_) {}

    let resEmail = { exito: false };
    if (pedido.email_cliente) {
      try {
        const asunto = `Tu pedido #${pedido.id} ha sido cancelado - El Chiringuito de Lukas`;
        const html = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #c62828;">Pedido Cancelado</h2>
            <p>Hola <strong>${pedido.nombre_cliente}</strong>,</p>
            <p>Tu pedido <strong>#${pedido.id}</strong> ha sido cancelado. Si tienes alguna duda o consideras que se trata de un error, contáctanos.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.9em; color: #666;">El Chiringuito de Lukas 🐾</p>
          </div>
        `;
        resEmail = await enviarCorreo(pedido.email_cliente, asunto, html);
      } catch (_) {}
    }

    return res.status(200).json({
      error: false,
      mensaje: 'Pedido cancelado exitosamente y stock reincorporado al inventario',
      pedido,
      whatsapp_enviado: Boolean(resWhatsApp.exito),
      correo_enviado: Boolean(resEmail.exito),
      link_whatsapp,
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (_) {}
    }
    next(error);
  }
};

export const actualizarEstadoPedido = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({
        error: true,
        mensaje: 'El nuevo estado es obligatorio',
      });
    }

    const pedido = await Pedido.findByPk(id);
    if (!pedido) {
      return res.status(404).json({
        error: true,
        mensaje: 'Pedido no encontrado',
      });
    }

    if (pedido.estado === 'entregado' || pedido.estado === 'cancelado') {
      return res.status(400).json({
        error: true,
        mensaje: `No se puede modificar el estado de un pedido que ya se encuentra en "${pedido.estado}"`,
      });
    }

    if (estado === 'cancelado') {
      return res.status(400).json({
        error: true,
        mensaje:
          'Para cancelar el pedido utiliza la ruta específica de cancelación (PUT /api/admin/pedidos/:id/cancelar)',
      });
    }

    const ESTADOS_VALIDOS = ['confirmado', 'en_proceso', 'entregado'];
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        error: true,
        mensaje: `Estado no válido. Los estados permitidos son: ${ESTADOS_VALIDOS.join(', ')}`,
      });
    }

    if (pedido.estado === 'pendiente') {
      return res.status(400).json({
        error: true,
        mensaje:
          'El pedido se encuentra en estado pendiente. Debe verificarse y aprobarse su pago antes de avanzar el estado.',
      });
    }

    if (pedido.estado === 'confirmado' && !['en_proceso', 'entregado'].includes(estado)) {
      return res.status(400).json({
        error: true,
        mensaje: 'Desde el estado confirmado solo se puede avanzar a en_proceso o entregado',
      });
    }

    if (pedido.estado === 'en_proceso' && estado !== 'entregado') {
      return res.status(400).json({
        error: true,
        mensaje: 'Desde el estado en_proceso solo se puede avanzar a entregado',
      });
    }

    pedido.estado = estado;
    await pedido.save();

    return res.status(200).json({
      error: false,
      mensaje: `Estado del pedido actualizado a "${estado}" exitosamente`,
      pedido,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Descarga o genera la nota de entrega en PDF para un pedido.
 * GET /api/admin/pedidos/:id/nota-entrega
 * Query param opcional: ?regenerar=true
 */
export const descargarNotaEntrega = async (req, res, next) => {
  try {
    const { id } = req.params;
    const regenerar = req.query.regenerar === 'true';

    // 1. Validar existencia del pedido ANTES de generar cualquier archivo
    const pedido = await Pedido.findByPk(id);
    if (!pedido) {
      return res.status(404).json({
        error: true,
        mensaje: 'Pedido no encontrado',
      });
    }

    const dirNotas = path.resolve(process.cwd(), 'uploads', 'notas-entrega');
    const rutaArchivo = path.join(dirNotas, `pedido-${id}.pdf`);
    const nombreDescarga = `nota-entrega-pedido-${id}.pdf`;

    // 2. Si ya existe en disco y no se pide regenerar, servirlo directamente
    if (fs.existsSync(rutaArchivo) && !regenerar) {
      return res.download(rutaArchivo, nombreDescarga);
    }

    // 3. Generar o regenerar el PDF
    await generarNotaEntregaPDF(id);

    return res.download(rutaArchivo, nombreDescarga);
  } catch (error) {
    next(error);
  }
};

export default {
  getPedidosAdmin,
  getPedidoByIdAdmin,
  getPagosPendientes,
  aprobarPago,
  rechazarPago,
  cancelarPedido,
  actualizarEstadoPedido,
  descargarNotaEntrega,
};
