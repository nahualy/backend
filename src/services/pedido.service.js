import { Producto, DetallePedido } from '../models/index.js';
import { generarLinkWhatsApp } from '../utils/whatsapp.util.js';
import { enviarWhatsApp } from './whatsapp.service.js';
import { enviarCorreo } from './email.service.js';

/**
 * Reincorpora el stock de los productos/variantes de un pedido cancelado
 */
export const devolverStockPedido = async (pedidoOrId, transaction) => {
  const pedidoId = typeof pedidoOrId === 'object' ? pedidoOrId.id : pedidoOrId;

  const detalles = await DetallePedido.findAll({
    where: { pedido_id: pedidoId },
    transaction,
  });

  for (const detalle of detalles) {
    if (detalle.variante_sku) {
      const producto = await Producto.findByPk(detalle.producto_id, {
        transaction,
        lock: true,
      });

      if (producto) {
        const variantes = Array.isArray(producto.variantes)
          ? producto.variantes.map((v) => ({ ...v }))
          : [];

        const index = variantes.findIndex((v) => v.sku === detalle.variante_sku);
        if (index !== -1) {
          variantes[index].stock = (Number(variantes[index].stock) || 0) + detalle.cantidad;
          producto.variantes = [...variantes];
          producto.changed('variantes', true);
          await producto.save({ transaction });
        }
      }
    } else if (detalle.producto_id) {
      const producto = await Producto.findByPk(detalle.producto_id, {
        transaction,
        lock: true,
      });

      if (producto && producto.stock !== null) {
        producto.stock = (Number(producto.stock) || 0) + detalle.cantidad;
        await producto.save({ transaction });
      }
    }
  }
};

/**
 * Valida stock suficiente, descuenta inventario bajo lock transaccional
 * y calcula precio unitario y total.
 * Reutilizada en checkout público y en registro manual de pedidos.
 */
export const procesarYDescontarStock = async (parsedItems, transaction) => {
  let totalCalculado = 0;
  const itemsProcesados = [];

  for (const item of parsedItems) {
    const productoId = parseInt(item.producto_id, 10);
    const cantidad = parseInt(item.cantidad, 10);
    const itemVarianteSku = item.variante_sku || item.sku;

    const producto = await Producto.findByPk(productoId, {
      transaction,
      lock: true,
    });

    if (!producto || !producto.activo) {
      const error = new Error(`El producto con ID ${productoId} no existe o se encuentra inactivo`);
      error.statusCode = 400;
      throw error;
    }

    if (itemVarianteSku) {
      const variantes = Array.isArray(producto.variantes)
        ? producto.variantes.map((v) => ({ ...v }))
        : [];

      const index = variantes.findIndex(
        (v) => v.sku && v.sku.trim().toLowerCase() === String(itemVarianteSku).trim().toLowerCase()
      );

      if (index === -1 || variantes[index].activo === false) {
        const error = new Error(
          `La variante con SKU "${itemVarianteSku}" para el producto "${producto.nombre}" no existe o se encuentra inactiva`
        );
        error.statusCode = 400;
        throw error;
      }

      const variante = variantes[index];
      const stockActual = Number(variante.stock) || 0;

      if (stockActual < cantidad) {
        const atributos = [variante.talla, variante.color].filter(Boolean).join(' / ');
        const error = new Error(
          `Stock insuficiente para el producto "${producto.nombre}" (Variante: ${atributos || variante.sku}). Disponibles: ${stockActual}, solicitados: ${cantidad}`
        );
        error.statusCode = 400;
        throw error;
      }

      variantes[index].stock = stockActual - cantidad;
      producto.variantes = [...variantes];
      producto.changed('variantes', true);
      await producto.save({ transaction });

      const precioUnitario =
        variante.precio_override !== null &&
        variante.precio_override !== undefined &&
        variante.precio_override !== ''
          ? parseFloat(variante.precio_override)
          : parseFloat(producto.precio);

      totalCalculado += precioUnitario * cantidad;

      itemsProcesados.push({
        producto_id: producto.id,
        variante_sku: variante.sku,
        variante_snapshot: {
          sku: variante.sku,
          talla: variante.talla,
          color: variante.color,
          precio_override: variante.precio_override,
        },
        cantidad,
        precio_unitario: precioUnitario,
      });
    } else {
      const tieneVariantesActivas =
        Array.isArray(producto.variantes) && producto.variantes.some((v) => v.activo !== false);

      if (tieneVariantesActivas) {
        const error = new Error(
          `El producto "${producto.nombre}" tiene variantes activas. Debe especificar una variante_sku`
        );
        error.statusCode = 400;
        throw error;
      }

      if (producto.stock === null || producto.stock < cantidad) {
        const error = new Error(
          `Stock insuficiente para el producto "${producto.nombre}". Disponibles: ${producto.stock !== null ? producto.stock : 0}, solicitados: ${cantidad}`
        );
        error.statusCode = 400;
        throw error;
      }

      producto.stock -= cantidad;
      await producto.save({ transaction });

      const precioUnitario = parseFloat(producto.precio);
      totalCalculado += precioUnitario * cantidad;

      itemsProcesados.push({
        producto_id: producto.id,
        variante_sku: null,
        variante_snapshot: null,
        cantidad,
        precio_unitario: precioUnitario,
      });
    }
  }

  return {
    totalCalculado: parseFloat(totalCalculado.toFixed(2)),
    itemsProcesados,
  };
};

/**
 * Envía las notificaciones automáticas (WhatsApp y correo si aplica)
 * para un pedido que ha sido confirmado y su pago aprobado.
 */
export const notificarPedidoConfirmado = async (pedido) => {
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

  return {
    whatsapp_enviado: Boolean(resWhatsApp.exito),
    correo_enviado: Boolean(resEmail.exito),
    link_whatsapp,
  };
};

export default {
  devolverStockPedido,
  procesarYDescontarStock,
  notificarPedidoConfirmado,
};
