import { Op } from 'sequelize';
import { Categoria, Producto } from '../models/index.js';

export const obtenerIdsCategoriasDescendientes = async (categoriaPadreId) => {
  const ids = [parseInt(categoriaPadreId, 10)];

  const buscarHijos = async (padreIds) => {
    if (!padreIds || padreIds.length === 0) return;

    const hijas = await Categoria.findAll({
      where: {
        categoria_padre_id: { [Op.in]: padreIds },
        activo: true,
      },
      attributes: ['id'],
    });

    if (hijas.length > 0) {
      const hijasIds = hijas.map((h) => h.id);
      ids.push(...hijasIds);
      await buscarHijos(hijasIds);
    }
  };

  await buscarHijos([parseInt(categoriaPadreId, 10)]);
  return ids;
};

export const getCategorias = async (req, res, next) => {
  try {
    const categorias = await Categoria.findAll({
      where: {
        categoria_padre_id: null,
        activo: true,
      },
      include: [
        {
          model: Categoria,
          as: 'subcategorias',
          where: { activo: true },
          required: false,
          include: [
            {
              model: Categoria,
              as: 'subcategorias',
              where: { activo: true },
              required: false,
            },
          ],
        },
      ],
      order: [
        ['nombre', 'ASC'],
        [{ model: Categoria, as: 'subcategorias' }, 'nombre', 'ASC'],
        [
          { model: Categoria, as: 'subcategorias' },
          { model: Categoria, as: 'subcategorias' },
          'nombre',
          'ASC',
        ],
      ],
    });

    return res.status(200).json({
      error: false,
      categorias,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductos = async (req, res, next) => {
  try {
    const { categoria_id, nombre, pagina = 1, limite = 20 } = req.query;

    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const limit = Math.max(1, parseInt(limite, 10) || 20);
    const offset = (page - 1) * limit;

    const whereConditions = {
      activo: true,
    };

    if (categoria_id) {
      const idsCategorias = await obtenerIdsCategoriasDescendientes(categoria_id);
      whereConditions.categoria_id = {
        [Op.in]: idsCategorias,
      };
    }

    if (nombre && nombre.trim() !== '') {
      whereConditions.nombre = {
        [Op.iLike]: `%${nombre.trim()}%`,
      };
    }

    const { count, rows } = await Producto.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [['id', 'DESC']],
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre'],
        },
      ],
      distinct: true,
    });

    const productosFormateados = rows.map((p) => {
      const prodJson = p.toJSON();
      const variantesActivas = Array.isArray(prodJson.variantes)
        ? prodJson.variantes.filter((v) => v.activo !== false)
        : [];
      return {
        ...prodJson,
        variantes: variantesActivas,
      };
    });

    return res.status(200).json({
      error: false,
      total: count,
      pagina: page,
      totalPaginas: Math.ceil(count / limit),
      limite: limit,
      productos: productosFormateados,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductoById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const producto = await Producto.findOne({
      where: {
        id,
        activo: true,
      },
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre'],
        },
      ],
    });

    if (!producto) {
      return res.status(404).json({
        error: true,
        mensaje: 'Producto no encontrado o no disponible',
      });
    }

    const prodJson = producto.toJSON();
    prodJson.variantes = Array.isArray(prodJson.variantes)
      ? prodJson.variantes.filter((v) => v.activo !== false)
      : [];

    return res.status(200).json({
      error: false,
      producto: prodJson,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  obtenerIdsCategoriasDescendientes,
  getCategorias,
  getProductos,
  getProductoById,
};
