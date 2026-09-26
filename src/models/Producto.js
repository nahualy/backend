import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Producto extends Model {
    static associate(models) {
      Producto.belongsTo(models.Categoria, {
        as: 'categoria',
        foreignKey: 'categoria_id',
      });
      Producto.hasMany(models.VarianteProducto, {
        as: 'variantes',
        foreignKey: 'producto_id',
      });
      Producto.hasMany(models.DetallePedido, {
        as: 'detalles_pedido',
        foreignKey: 'producto_id',
      });
    }
  }

  Producto.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      descripcion_corta: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      foto: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0.01,
        },
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      categoria_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'categorias',
          key: 'id',
        },
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Producto',
      tableName: 'productos',
      underscored: true,
      timestamps: true,
    }
  );

  return Producto;
};
