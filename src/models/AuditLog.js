import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.Usuario, {
        as: 'usuario',
        foreignKey: 'usuario_id',
      });
    }
  }

  AuditLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
      },
      accion: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entidad: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entidad_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      datos_anteriores: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      datos_nuevos: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ip_origen: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'audit_logs',
      underscored: true,
      timestamps: true,
      updatedAt: false,
      createdAt: 'created_at',
    }
  );

  return AuditLog;
};
