import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class VarianteProducto extends Model {
    static associate(models) {
      VarianteProducto.belongsTo(models.Producto, {
        as: 'producto',
        foreignKey: 'producto_id',
      });
      VarianteProducto.hasMany(models.DetallePedido, {
        as: 'detalles_pedido',
        foreignKey: 'variante_id',
      });
    }
  }

  VarianteProducto.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      producto_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'productos',
          key: 'id',
        },
      },
      talla: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      color: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      sku: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VarianteProducto',
      tableName: 'variantes_producto',
      underscored: true,
      timestamps: true,
    }
  );

  return VarianteProducto;
};
