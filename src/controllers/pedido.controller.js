import fs from 'fs';
import { sequelize, Pedido, DetallePedido, Pago, Producto } from '../models/index.js';
import { generarLinkWhatsApp } from '../utils/whatsapp.util.js';
import { enviarWhatsApp } from '../services/whatsapp.service.js';
import { enviarCorreo } from '../services/email.service.js';
import { procesarYDescontarStock } from '../services/pedido.service.js';

export const crearPedido = async (req, res, next) => {
  let transaction;
  try {
    const {
      nombre_cliente,
      email_cliente,
      telefono_cliente,
      direccion_entrega,
      notas,
      metodo,
      monto,
      items,
    } = req.body;

    const limpiarArchivoSubido = () => {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }
    };

    if (!nombre_cliente || nombre_cliente.trim() === '') {
      limpiarArchivoSubido();
      return res.status(400).json({ error: true, mensaje: 'El nombre del cliente es obligatorio' });
    }

    if (!telefono_cliente || telefono_cliente.trim() === '') {
      limpiarArchivoSubido();
      return res.status(400).json({ error: true, mensaje: 'El teléfono del cliente es obligatorio' });
    }

    if (!direccion_entrega || direccion_entrega.trim() === '') {
      limpiarArchivoSubido();
      return res.status(400).json({ error: true, mensaje: 'La dirección de entrega es obligatoria' });
    }

    const METODOS_PERMITIDOS = ['pago_movil', 'zelle', 'binance', 'paypal'];
    if (!metodo || !METODOS_PERMITIDOS.includes(metodo)) {
      limpiarArchivoSubido();
      return res.status(400).json({
        error: true,
        mensaje: `El método de pago es inválido. Métodos permitidos: ${METODOS_PERMITIDOS.join(', ')}`,
      });
    }

    if (monto === undefined || monto === null || isNaN(monto) || Number(monto) <= 0) {
      limpiarArchivoSubido();
      return res.status(400).json({ error: true, mensaje: 'El monto del pago debe ser un número mayor a cero' });
    }

    if (!req.file) {
      return res.status(400).json({ error: true, mensaje: 'El comprobante de pago es obligatorio' });
    }

    if (!items) {
      limpiarArchivoSubido();
      return res.status(400).json({ error: true, mensaje: 'Debe incluir al menos un producto en el pedido (campo items)' });
    }

    let parsedItems;
    try {
      parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    } catch (parseError) {
      limpiarArchivoSubido();
      return res.status(400).json({ error: true, mensaje: 'El campo items debe ser un array JSON válido' });
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      limpiarArchivoSubido();
      return res.status(400).json({ error: true, mensaje: 'El array de items debe contener al menos un elemento' });
    }

    for (const item of parsedItems) {
      if (!item.producto_id || isNaN(parseInt(item.producto_id, 10))) {
        limpiarArchivoSubido();
        return res.status(400).json({ error: true, mensaje: 'Cada item debe tener un producto_id numérico válido' });
      }
      const cant = Number(item.cantidad);
      if (!Number.isInteger(cant) || cant <= 0) {
        limpiarArchivoSubido();
        return res.status(400).json({ error: true, mensaje: 'Cada item debe tener una cantidad entera mayor a cero' });
      }
    }

    transaction = await sequelize.transaction();

    let totalCalculado;
    let itemsProcesados;
    try {
      const resultadoStock = await procesarYDescontarStock(parsedItems, transaction);
      totalCalculado = resultadoStock.totalCalculado;
      itemsProcesados = resultadoStock.itemsProcesados;
    } catch (stockError) {
      await transaction.rollback();
      limpiarArchivoSubido();
      return res.status(stockError.statusCode || 400).json({
        error: true,
        mensaje: stockError.message,
      });
    }

    const nuevoPedido = await Pedido.create(
      {
        nombre_cliente: nombre_cliente.trim(),
        email_cliente: email_cliente && email_cliente.trim() ? email_cliente.trim() : null,
        telefono_cliente: telefono_cliente.trim(),
        direccion_entrega: direccion_entrega.trim(),
        notas: notas ? notas.trim() : null,
        total: parseFloat(totalCalculado.toFixed(2)),
        estado: 'pendiente',
      },
      { transaction }
    );

    for (const item of itemsProcesados) {
      await DetallePedido.create(
        {
          pedido_id: nuevoPedido.id,
          producto_id: item.producto_id,
          variante_sku: item.variante_sku,
          variante_snapshot: item.variante_snapshot,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        },
        { transaction }
      );
    }

    const comprobanteUrl = `/uploads/comprobantes/${req.file.filename}`;
    await Pago.create(
      {
        pedido_id: nuevoPedido.id,
        metodo,
        monto: parseFloat(monto),
        comprobante_url: comprobanteUrl,
        estado: 'pendiente',
        origen: 'checkout_publico',
      },
      { transaction }
    );

    await transaction.commit();

    const pedidoCompleto = await Pedido.findByPk(nuevoPedido.id, {
      include: [
        {
          model: DetallePedido,
          as: 'detalles',
          include: [
            { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'foto', 'precio'] },
          ],
        },
        { model: Pago, as: 'pagos' },
      ],
    });

    const totalFormateado = Number(nuevoPedido.total).toFixed(2);
    const mensajeWhatsApp = `Hola ${nuevoPedido.nombre_cliente}, recibimos tu pedido #${nuevoPedido.id} por un total de $${totalFormateado}. Estamos verificando tu comprobante de pago. ¡Gracias por elegir El Chiringuito de Lukas! 🐾`;
    const link_whatsapp = generarLinkWhatsApp(nuevoPedido.telefono_cliente, mensajeWhatsApp);

    let resWhatsApp = { exito: false };
    try {
      resWhatsApp = await enviarWhatsApp(nuevoPedido.telefono_cliente, mensajeWhatsApp);
    } catch (_) {}

    let resEmail = { exito: false };
    if (nuevoPedido.email_cliente) {
      try {
        const asunto = `Pedido #${nuevoPedido.id} recibido con éxito - El Chiringuito de Lukas`;
        const html = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #1976d2;">¡Pedido Recibido! 🛍️</h2>
            <p>Hola <strong>${nuevoPedido.nombre_cliente}</strong>,</p>
            <p>Hemos recibido tu pedido <strong>#${nuevoPedido.id}</strong> por un total de <strong>$${totalFormateado}</strong>.</p>
            <p>Nuestro equipo está revisando tu comprobante de pago. Te notificaremos en cuanto sea verificado y aprobado.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.9em; color: #666;">Gracias por comprar en <strong>El Chiringuito de Lukas</strong> 🐾</p>
          </div>
        `;
        resEmail = await enviarCorreo(nuevoPedido.email_cliente, asunto, html);
      } catch (_) {}
    }

    return res.status(201).json({
      error: false,
      mensaje: 'Pedido creado exitosamente',
      pedido: pedidoCompleto,
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
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    next(error);
  }
};

export const agregarPago = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { metodo, monto } = req.body;

    const limpiarArchivoSubido = () => {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }
    };

    if (!req.file) {
      return res.status(400).json({ error: true, mensaje: 'El comprobante de pago es obligatorio' });
    }

    const METODOS_PERMITIDOS = ['pago_movil', 'zelle', 'binance', 'paypal'];
    if (!metodo || !METODOS_PERMITIDOS.includes(metodo)) {
      limpiarArchivoSubido();
      return res.status(400).json({
        error: true,
        mensaje: `El método de pago es inválido. Métodos permitidos: ${METODOS_PERMITIDOS.join(', ')}`,
      });
    }

    if (monto === undefined || monto === null || isNaN(monto) || Number(monto) <= 0) {
      limpiarArchivoSubido();
      return res.status(400).json({ error: true, mensaje: 'El monto debe ser un número mayor a cero' });
    }

    const pedido = await Pedido.findByPk(id);
    if (!pedido) {
      limpiarArchivoSubido();
      return res.status(404).json({ error: true, mensaje: 'Pedido no encontrado' });
    }

    if (pedido.estado !== 'pendiente') {
      limpiarArchivoSubido();
      return res.status(400).json({
        error: true,
        mensaje: `No se pueden registrar pagos para un pedido en estado "${pedido.estado}". Solo se admiten pagos en pedidos pendientes.`,
      });
    }

    const rechazosCount = await Pago.count({
      where: { pedido_id: pedido.id, estado: 'rechazado' },
    });

    if (rechazosCount >= 3) {
      limpiarArchivoSubido();
      return res.status(400).json({
        error: true,
        mensaje: 'El pedido ha alcanzado el límite máximo de intentos de pago (3 intentos)',
      });
    }

    const pendienteCount = await Pago.count({
      where: { pedido_id: pedido.id, estado: 'pendiente' },
    });

    if (pendienteCount > 0) {
      limpiarArchivoSubido();
      return res.status(400).json({
        error: true,
        mensaje:
          'Ya existe un comprobante de pago pendiente de verificación para este pedido. Por favor espera la respuesta del administrador.',
      });
    }

    const comprobanteUrl = `/uploads/comprobantes/${req.file.filename}`;
    const nuevoPago = await Pago.create({
      pedido_id: pedido.id,
      metodo,
      monto: parseFloat(monto),
      comprobante_url: comprobanteUrl,
      estado: 'pendiente',
    });

    return res.status(201).json({
      error: false,
      mensaje: 'Nuevo comprobante de pago registrado exitosamente. Será revisado por el equipo.',
      pago: nuevoPago,
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    next(error);
  }
};

export const getPedidoPublico = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pedido = await Pedido.findByPk(id, {
      attributes: ['id', 'nombre_cliente', 'email_cliente', 'estado', 'total', 'created_at', 'updated_at'],
      include: [
        {
          model: DetallePedido,
          as: 'detalles',
          attributes: ['id', 'cantidad', 'precio_unitario', 'variante_sku', 'variante_snapshot'],
          include: [
            { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'foto'] },
          ],
        },
        {
          model: Pago,
          as: 'pagos',
          attributes: ['id', 'metodo', 'monto', 'estado', 'motivo_rechazo', 'created_at', 'fecha_verificacion'],
        },
      ],
      order: [[{ model: Pago, as: 'pagos' }, 'created_at', 'ASC']],
    });

    if (!pedido) {
      return res.status(404).json({ error: true, mensaje: 'Pedido no encontrado' });
    }

    return res.status(200).json({ error: false, pedido });
  } catch (error) {
    next(error);
  }
};

export default {
  crearPedido,
  agregarPago,
  getPedidoPublico,
};
