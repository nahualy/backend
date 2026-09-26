import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Pedido extends Model {
    static associate(models) {
      Pedido.hasMany(models.DetallePedido, {
        as: 'detalles',
        foreignKey: 'pedido_id',
      });
      Pedido.hasMany(models.Pago, {
        as: 'pagos',
        foreignKey: 'pedido_id',
      });
    }
  }

  Pedido.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nombre_cliente: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      telefono_cliente: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      direccion_entrega: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      estado: {
        type: DataTypes.ENUM('pendiente', 'confirmado', 'en_proceso', 'entregado', 'cancelado'),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Pedido',
      tableName: 'pedidos',
      underscored: true,
      timestamps: true,
    }
  );

  return Pedido;
};
