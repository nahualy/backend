import { Producto, DetallePedido } from '../models/index.js';

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

export default {
  devolverStockPedido,
};
