import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class DetallePedido extends Model {
    static associate(models) {
      DetallePedido.belongsTo(models.Pedido, {
        as: 'pedido',
        foreignKey: 'pedido_id',
      });
      DetallePedido.belongsTo(models.Producto, {
        as: 'producto',
        foreignKey: 'producto_id',
      });
    }
  }

  DetallePedido.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pedido_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'pedidos',
          key: 'id',
        },
      },
      producto_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'productos',
          key: 'id',
        },
      },
      variante_sku: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      variante_snapshot: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      precio_unitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'DetallePedido',
      tableName: 'detalles_pedido',
      underscored: true,
      timestamps: true,
    }
  );

  return DetallePedido;
};
