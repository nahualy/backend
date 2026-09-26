import { Op } from 'sequelize';
import { Producto, VarianteProducto, Categoria } from '../models/index.js';
import { obtenerIdsCategoriasDescendientes } from './public.controller.js';

export const getProductosAdmin = async (req, res, next) => {
  try {
    const { categoria_id, nombre, estado = 'todos', pagina = 1, limite = 20 } = req.query;

    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const limit = Math.max(1, parseInt(limite, 10) || 20);
    const offset = (page - 1) * limit;

    const whereConditions = {};

    if (estado === 'activos') {
      whereConditions.activo = true;
    } else if (estado === 'inactivos') {
      whereConditions.activo = false;
    }

    if (categoria_id) {
      const idsCategorias = await obtenerIdsCategoriasDescendientes(categoria_id);
      whereConditions.categoria_id = { [Op.in]: idsCategorias };
    }

    if (nombre && nombre.trim() !== '') {
      whereConditions.nombre = { [Op.iLike]: `%${nombre.trim()}%` };
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
        {
          model: VarianteProducto,
          as: 'variantes',
          attributes: ['id', 'talla', 'color', 'stock', 'sku', 'activo'],
        },
      ],
      distinct: true,
    });

    return res.status(200).json({
      error: false,
      total: count,
      pagina: page,
      totalPaginas: Math.ceil(count / limit),
      limite: limit,
      productos: rows,
    });
  } catch (error) {
    next(error);
  }
};

export const crearProducto = async (req, res, next) => {
  try {
    const { nombre, descripcion_corta, precio, categoria_id, stock } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        error: true,
        mensaje: 'El nombre del producto es obligatorio',
      });
    }

    if (precio === undefined || precio === null || isNaN(precio) || Number(precio) <= 0) {
      return res.status(400).json({
        error: true,
        mensaje: 'El precio debe ser un número mayor a cero',
      });
    }

    if (!categoria_id) {
      return res.status(400).json({
        error: true,
        mensaje: 'La categoría es obligatoria',
      });
    }

    const categoriaExiste = await Categoria.findOne({
      where: { id: categoria_id, activo: true },
    });

    if (!categoriaExiste) {
      return res.status(400).json({
        error: true,
        mensaje: 'La categoría especificada no existe o se encuentra inactiva',
      });
    }

    let parsedStock = null;
    if (stock !== undefined && stock !== null && stock !== '') {
      parsedStock = parseInt(stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
          error: true,
          mensaje: 'El stock debe ser un número entero mayor o igual a cero',
        });
      }
    }

    const foto = req.file ? `/uploads/productos/${req.file.filename}` : null;

    const nuevoProducto = await Producto.create({
      nombre: nombre.trim(),
      descripcion_corta: descripcion_corta ? descripcion_corta.trim() : null,
      foto,
      precio: parseFloat(precio),
      stock: parsedStock,
      categoria_id: parseInt(categoria_id, 10),
      activo: true,
    });

    return res.status(201).json({
      error: false,
      mensaje: 'Producto creado exitosamente',
      producto: nuevoProducto,
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarProducto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion_corta, precio, categoria_id, stock, activo } = req.body;

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        error: true,
        mensaje: 'Producto no encontrado',
      });
    }

    if (nombre !== undefined) {
      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
          error: true,
          mensaje: 'El nombre del producto no puede estar vacío',
        });
      }
      producto.nombre = nombre.trim();
    }

    if (precio !== undefined) {
      if (isNaN(precio) || Number(precio) <= 0) {
        return res.status(400).json({
          error: true,
          mensaje: 'El precio debe ser un número mayor a cero',
        });
      }
      producto.precio = parseFloat(precio);
    }

    if (categoria_id !== undefined) {
      const categoriaExiste = await Categoria.findOne({
        where: { id: categoria_id, activo: true },
      });
      if (!categoriaExiste) {
        return res.status(400).json({
          error: true,
          mensaje: 'La categoría especificada no existe o se encuentra inactiva',
        });
      }
      producto.categoria_id = parseInt(categoria_id, 10);
    }

    if (descripcion_corta !== undefined) {
      producto.descripcion_corta = descripcion_corta ? descripcion_corta.trim() : null;
    }

    if (stock !== undefined) {
      if (stock === null || stock === '') {
        producto.stock = null;
      } else {
        const variantesActivas = await VarianteProducto.count({
          where: {
            producto_id: producto.id,
            activo: true,
          },
        });

        if (variantesActivas > 0) {
          return res.status(400).json({
            error: true,
            mensaje:
              'Este producto tiene variantes activas; el stock se gestiona por variante, no directamente en el producto',
          });
        }

        const parsedStock = parseInt(stock, 10);
        if (isNaN(parsedStock) || parsedStock < 0) {
          return res.status(400).json({
            error: true,
            mensaje: 'El stock debe ser un número entero mayor o igual a cero',
          });
        }
        producto.stock = parsedStock;
      }
    }

    if (activo !== undefined) {
      producto.activo = Boolean(activo);
    }

    if (req.file) {
      producto.foto = `/uploads/productos/${req.file.filename}`;
    }

    await producto.save();

    return res.status(200).json({
      error: false,
      mensaje: 'Producto actualizado exitosamente',
      producto,
    });
  } catch (error) {
    next(error);
  }
};

export const eliminarProducto = async (req, res, next) => {
  try {
    const { id } = req.params;

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        error: true,
        mensaje: 'Producto no encontrado',
      });
    }

    producto.activo = false;
    await producto.save();

    return res.status(200).json({
      error: false,
      mensaje: 'Producto desactivado exitosamente (soft delete)',
    });
  } catch (error) {
    next(error);
  }
};

export const crearVariante = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { talla, color, stock, sku } = req.body;

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({
        error: true,
        mensaje: 'Producto no encontrado',
      });
    }

    if (!sku || sku.trim() === '') {
      return res.status(400).json({
        error: true,
        mensaje: 'El SKU es obligatorio y debe ser único',
      });
    }

    const skuExiste = await VarianteProducto.findOne({
      where: { sku: sku.trim() },
    });
    if (skuExiste) {
      return res.status(400).json({
        error: true,
        mensaje: 'Ya existe una variante con ese SKU',
      });
    }

    let parsedStock = 0;
    if (stock !== undefined && stock !== null && stock !== '') {
      parsedStock = parseInt(stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
          error: true,
          mensaje: 'El stock debe ser un número entero mayor o igual a cero',
        });
      }
    }

    const nuevaVariante = await VarianteProducto.create({
      producto_id: producto.id,
      talla: talla ? talla.trim() : null,
      color: color ? color.trim() : null,
      stock: parsedStock,
      sku: sku.trim(),
      activo: true,
    });

    if (producto.stock !== null) {
      producto.stock = null;
      await producto.save();
    }

    return res.status(201).json({
      error: false,
      mensaje: 'Variante creada exitosamente',
      variante: nuevaVariante,
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarVariante = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { talla, color, stock, activo } = req.body;

    const variante = await VarianteProducto.findByPk(id);
    if (!variante) {
      return res.status(404).json({
        error: true,
        mensaje: 'Variante no encontrada',
      });
    }

    if (talla !== undefined) {
      variante.talla = talla ? talla.trim() : null;
    }

    if (color !== undefined) {
      variante.color = color ? color.trim() : null;
    }

    if (stock !== undefined) {
      const parsedStock = parseInt(stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
          error: true,
          mensaje: 'El stock debe ser un número entero mayor o igual a cero',
        });
      }
      variante.stock = parsedStock;
    }

    if (activo !== undefined) {
      variante.activo = Boolean(activo);
    }

    await variante.save();

    return res.status(200).json({
      error: false,
      mensaje: 'Variante actualizada exitosamente',
      variante,
    });
  } catch (error) {
    next(error);
  }
};

export const eliminarVariante = async (req, res, next) => {
  try {
    const { id } = req.params;

    const variante = await VarianteProducto.findByPk(id);
    if (!variante) {
      return res.status(404).json({
        error: true,
        mensaje: 'Variante no encontrada',
      });
    }

    variante.activo = false;
    await variante.save();

    return res.status(200).json({
      error: false,
      mensaje: 'Variante desactivada exitosamente (soft delete)',
    });
  } catch (error) {
    next(error);
  }
};

export const getAlertasStock = async (req, res, next) => {
  try {
    const productosSinVariantes = await Producto.findAll({
      where: {
        activo: true,
        stock: {
          [Op.ne]: null,
          [Op.lte]: 5,
        },
      },
      attributes: ['id', 'nombre', 'stock', 'precio'],
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre'],
        },
      ],
    });

    const variantesAlerta = await VarianteProducto.findAll({
      where: {
        activo: true,
        stock: {
          [Op.lte]: 5,
        },
      },
      attributes: ['id', 'talla', 'color', 'stock', 'sku', 'producto_id'],
      include: [
        {
          model: Producto,
          as: 'producto',
          attributes: ['id', 'nombre', 'precio'],
          where: { activo: true },
        },
      ],
    });

    return res.status(200).json({
      error: false,
      alertas: {
        productos_sin_variantes: productosSinVariantes,
        variantes: variantesAlerta,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getProductosAdmin,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  crearVariante,
  actualizarVariante,
  eliminarVariante,
  getAlertasStock,
};
