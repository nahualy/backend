import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Pago extends Model {
    static associate(models) {
      Pago.belongsTo(models.Pedido, {
        as: 'pedido',
        foreignKey: 'pedido_id',
      });
      Pago.belongsTo(models.Usuario, {
        as: 'verificador',
        foreignKey: 'verificado_por',
      });
    }
  }

  Pago.init(
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
      metodo: {
        type: DataTypes.ENUM('pago_movil', 'zelle', 'binance', 'paypal'),
        allowNull: false,
      },
      monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      comprobante_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      estado: {
        type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      verificado_por: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
      },
      fecha_verificacion: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      datos_extraidos: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Pago',
      tableName: 'pagos',
      underscored: true,
      timestamps: true,
    }
  );

  return Pago;
};
