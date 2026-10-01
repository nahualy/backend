/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // a) Agregar la columna "variantes" (JSONB, allowNull: false, defaultValue: []) a la tabla productos
    await queryInterface.addColumn('productos', 'variantes', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });

    // b) Migrar datos existentes antes de eliminar la tabla
    const [variantes] = await queryInterface.sequelize.query(
      'SELECT id, producto_id, sku, talla, color, stock, activo FROM "variantes_producto" ORDER BY id ASC;'
    );

    const variantesPorProducto = {};
    for (const v of variantes) {
      if (!variantesPorProducto[v.producto_id]) {
        variantesPorProducto[v.producto_id] = [];
      }
      variantesPorProducto[v.producto_id].push({
        sku: v.sku,
        talla: v.talla,
        color: v.color,
        stock: Number(v.stock),
        precio_override: null,
        activo: v.activo !== false,
      });
    }

    for (const [productoId, arrVariantes] of Object.entries(variantesPorProducto)) {
      await queryInterface.sequelize.query(
        'UPDATE "productos" SET "variantes" = :variantes WHERE "id" = :id;',
        {
          replacements: {
            variantes: JSON.stringify(arrVariantes),
            id: productoId,
          },
        }
      );
    }

    // c) Eliminar la tabla variantes_producto por completo (dropTable)
    try {
      await queryInterface.removeConstraint('detalles_pedido', 'detalles_pedido_variante_id_fkey');
    } catch (err) {
      // Ignorar si la restricción ya no existe
    }
    await queryInterface.dropTable('variantes_producto', { cascade: true });
  },

  async down(queryInterface, Sequelize) {
    // Recrear la tabla variantes_producto con su estructura original
    // NOTA: Esta migración tiene pérdida de datos si se revierte;
    // solo se reconstruye la estructura de la tabla, los datos de variantes
    // residen en la columna JSONB de productos antes de revertirse.
    await queryInterface.createTable('variantes_producto', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      producto_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'productos',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      talla: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      color: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Eliminar columna "variantes" de la tabla productos
    await queryInterface.removeColumn('productos', 'variantes');
  },
};
