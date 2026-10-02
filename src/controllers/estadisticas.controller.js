import { Sequelize, Pedido, DetallePedido, Producto } from '../models/index.js';

const { Op, fn, col, literal } = Sequelize;

// Estados considerados válidos como venta
const ESTADOS_VALIDOS_VENTA = ['confirmado', 'en_proceso', 'entregado'];

/**
 * 1. Obtener ingresos totales y cantidad de pedidos en un periodo
 * GET /api/admin/estadisticas/ingresos
 * Query params: periodo ('hoy' | 'semana' | 'mes', default: 'mes')
 */
export const getIngresos = async (req, res, next) => {
  try {
    const periodo = ['hoy', 'semana', 'mes'].includes(req.query.periodo)
      ? req.query.periodo
      : 'mes';

    const ahora = new Date();
    let fechaDesde;

    if (periodo === 'hoy') {
      fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    } else if (periodo === 'semana') {
      const diaSemana = ahora.getDay();
      const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
      fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - diasDesdeLunes, 0, 0, 0, 0);
    } else {
      // mes
      fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
    }

    // Agregación SQL: SUM y COUNT directo en base de datos
    const resultado = await Pedido.findOne({
      where: {
        estado: { [Op.in]: ESTADOS_VALIDOS_VENTA },
        createdAt: {
          [Op.gte]: fechaDesde,
          [Op.lte]: ahora,
        },
      },
      attributes: [
        [fn('COALESCE', fn('SUM', col('total')), 0), 'ingresos_totales'],
        [fn('COUNT', col('id')), 'cantidad_pedidos'],
      ],
      raw: true,
    });

    const ingresos_totales = parseFloat(Number(resultado?.ingresos_totales || 0).toFixed(2));
    const cantidad_pedidos = parseInt(resultado?.cantidad_pedidos || 0, 10);

    return res.status(200).json({
      error: false,
      periodo,
      ingresos_totales,
      cantidad_pedidos,
      fecha_desde: fechaDesde.toISOString(),
      fecha_hasta: ahora.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Obtener productos más vendidos
 * GET /api/admin/estadisticas/productos-mas-vendidos
 * Query params: limite (default 10, max 50)
 */
export const getProductosMasVendidos = async (req, res, next) => {
  try {
    let limit = parseInt(req.query.limite, 10) || 10;
    if (limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    // Consulta agrupada por producto_id en pedidos confirmados/en_proceso/entregados
    const productosVendidos = await DetallePedido.findAll({
      attributes: [
        'producto_id',
        [fn('SUM', col('DetallePedido.cantidad')), 'cantidad_vendida'],
        [fn('SUM', literal('cantidad * precio_unitario')), 'ingresos_generados'],
      ],
      include: [
        {
          model: Pedido,
          as: 'pedido',
          attributes: [],
          where: {
            estado: { [Op.in]: ESTADOS_VALIDOS_VENTA },
          },
        },
        {
          model: Producto,
          as: 'producto',
          attributes: ['nombre', 'foto'],
        },
      ],
      group: ['DetallePedido.producto_id', 'producto.id', 'producto.nombre', 'producto.foto'],
      order: [[literal('cantidad_vendida'), 'DESC']],
      limit,
    });

    const productos = productosVendidos.map((item) => ({
      producto_id: item.producto_id,
      nombre: item.producto?.nombre || 'Producto Desconocido',
      foto: item.producto?.foto || null,
      cantidad_vendida: parseInt(item.getDataValue('cantidad_vendida') || 0, 10),
      ingresos_generados: parseFloat(Number(item.getDataValue('ingresos_generados') || 0).toFixed(2)),
    }));

    return res.status(200).json({
      error: false,
      productos,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Obtener conteo de pedidos por estado
 * GET /api/admin/estadisticas/pedidos-por-estado
 * Incluye todos los estados (pendiente, confirmado, en_proceso, entregado, cancelado)
 */
export const getPedidosPorEstado = async (req, res, next) => {
  try {
    const conteo = await Pedido.findAll({
      attributes: ['estado', [fn('COUNT', col('id')), 'total']],
      group: ['estado'],
      raw: true,
    });

    const estados = {
      pendiente: 0,
      confirmado: 0,
      en_proceso: 0,
      entregado: 0,
      cancelado: 0,
      total_pedidos: 0,
    };

    let totalGeneral = 0;
    conteo.forEach((row) => {
      const cant = parseInt(row.total, 10) || 0;
      if (Object.prototype.hasOwnProperty.call(estados, row.estado)) {
        estados[row.estado] = cant;
      }
      totalGeneral += cant;
    });

    estados.total_pedidos = totalGeneral;

    return res.status(200).json({
      error: false,
      ...estados,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getIngresos,
  getProductosMasVendidos,
  getPedidosPorEstado,
};
