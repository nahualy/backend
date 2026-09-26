import fs from 'fs';
import { sequelize, Pedido, DetallePedido, Pago, Producto, VarianteProducto } from '../models/index.js';
import { generarLinkWhatsApp } from '../utils/whatsapp.util.js';

export const crearPedido = async (req, res, next) => {
  let transaction;
  try {
    const {
      nombre_cliente,
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

    let totalCalculado = 0;
    const itemsProcesados = [];

    for (const item of parsedItems) {
      const productoId = parseInt(item.producto_id, 10);
      const cantidad = parseInt(item.cantidad, 10);

      const producto = await Producto.findByPk(productoId, {
        transaction,
        lock: true,
      });

      if (!producto || !producto.activo) {
        await transaction.rollback();
        limpiarArchivoSubido();
        return res.status(400).json({
          error: true,
          mensaje: `El producto con ID ${productoId} no existe o se encuentra inactivo`,
        });
      }

      let variante = null;
      if (item.variante_id) {
        const varianteId = parseInt(item.variante_id, 10);
        variante = await VarianteProducto.findOne({
          where: { id: varianteId, producto_id: producto.id, activo: true },
          transaction,
          lock: true,
        });

        if (!variante) {
          await transaction.rollback();
          limpiarArchivoSubido();
          return res.status(400).json({
            error: true,
            mensaje: `La variante con ID ${varianteId} para el producto "${producto.nombre}" no existe o se encuentra inactiva`,
          });
        }

        if (variante.stock < cantidad) {
          await transaction.rollback();
          limpiarArchivoSubido();
          const atributos = [variante.talla, variante.color].filter(Boolean).join(' / ');
          return res.status(400).json({
            error: true,
            mensaje: `Stock insuficiente para el producto "${producto.nombre}" (Variante: ${atributos || `ID ${variante.id}`}). Disponibles: ${variante.stock}, solicitados: ${cantidad}`,
          });
        }

        variante.stock -= cantidad;
        await variante.save({ transaction });
      } else {
        const variantesActivas = await VarianteProducto.count({
          where: { producto_id: producto.id, activo: true },
          transaction,
        });

        if (variantesActivas > 0) {
          await transaction.rollback();
          limpiarArchivoSubido();
          return res.status(400).json({
            error: true,
            mensaje: `El producto "${producto.nombre}" tiene variantes activas. Debe especificar una variante_id`,
          });
        }

        if (producto.stock === null || producto.stock < cantidad) {
          await transaction.rollback();
          limpiarArchivoSubido();
          return res.status(400).json({
            error: true,
            mensaje: `Stock insuficiente para el producto "${producto.nombre}". Disponibles: ${producto.stock !== null ? producto.stock : 0}, solicitados: ${cantidad}`,
          });
        }

        producto.stock -= cantidad;
        await producto.save({ transaction });
      }

      const precioUnitario = parseFloat(producto.precio);
      totalCalculado += precioUnitario * cantidad;

      itemsProcesados.push({
        producto_id: producto.id,
        variante_id: variante ? variante.id : null,
        cantidad,
        precio_unitario: precioUnitario,
      });
    }

    const nuevoPedido = await Pedido.create(
      {
        nombre_cliente: nombre_cliente.trim(),
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
          variante_id: item.variante_id,
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
            { model: VarianteProducto, as: 'variante', attributes: ['id', 'talla', 'color', 'sku'] },
          ],
        },
        { model: Pago, as: 'pagos' },
      ],
    });

    const totalFormateado = Number(nuevoPedido.total).toFixed(2);
    const mensajeWhatsApp = `Hola ${nuevoPedido.nombre_cliente}, recibimos tu pedido #${nuevoPedido.id} por un total de $${totalFormateado}. Estamos verificando tu comprobante de pago.`;
    const link_whatsapp = generarLinkWhatsApp(nuevoPedido.telefono_cliente, mensajeWhatsApp);

    return res.status(201).json({
      error: false,
      mensaje: 'Pedido creado exitosamente',
      pedido: pedidoCompleto,
      link_whatsapp,
    });
  } catch (error) {
    if (transaction) {
      try { await transaction.rollback(); } catch (_) {}
    }
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
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
        try { fs.unlinkSync(req.file.path); } catch (_) {}
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
        mensaje: 'Ya existe un comprobante de pago pendiente de verificación para este pedido. Por favor espera la respuesta del administrador.',
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
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    next(error);
  }
};

export const getPedidoPublico = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pedido = await Pedido.findByPk(id, {
      attributes: ['id', 'nombre_cliente', 'estado', 'total', 'created_at', 'updated_at'],
      include: [
        {
          model: DetallePedido,
          as: 'detalles',
          attributes: ['id', 'cantidad', 'precio_unitario'],
          include: [
            { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'foto'] },
            { model: VarianteProducto, as: 'variante', attributes: ['id', 'talla', 'color', 'sku'] },
          ],
        },
        {
          model: Pago,
          as: 'pagos',
          attributes: ['id', 'metodo', 'monto', 'estado', 'created_at', 'fecha_verificacion'],
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
