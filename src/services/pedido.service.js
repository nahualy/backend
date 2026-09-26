import { Producto, VarianteProducto, DetallePedido } from '../models/index.js';

export const devolverStockPedido = async (pedidoOrId, transaction) => {
  const pedidoId = typeof pedidoOrId === 'object' ? pedidoOrId.id : pedidoOrId;

  const detalles = await DetallePedido.findAll({
    where: { pedido_id: pedidoId },
    transaction,
  });

  for (const detalle of detalles) {
    if (detalle.variante_id) {
      const variante = await VarianteProducto.findByPk(detalle.variante_id, {
        transaction,
        lock: true,
      });
      if (variante) {
        variante.stock = (variante.stock || 0) + detalle.cantidad;
        await variante.save({ transaction });
      }
    } else if (detalle.producto_id) {
      const producto = await Producto.findByPk(detalle.producto_id, {
        transaction,
        lock: true,
      });
      if (producto && producto.stock !== null) {
        producto.stock = (producto.stock || 0) + detalle.cantidad;
        await producto.save({ transaction });
      }
    }
  }
};

export default {
  devolverStockPedido,
};
