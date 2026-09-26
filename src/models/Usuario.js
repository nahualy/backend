import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Usuario extends Model {
    static associate(models) {
      Usuario.hasMany(models.Pago, {
        as: 'pagos_verificados',
        foreignKey: 'verificado_por',
      });
    }
  }

  Usuario.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nombre_completo: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      rol: {
        type: DataTypes.ENUM('admin', 'personal'),
        allowNull: false,
        defaultValue: 'personal',
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Usuario',
      tableName: 'usuarios',
      underscored: true,
      timestamps: true,
    }
  );

  return Usuario;
};
