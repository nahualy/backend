import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Categoria extends Model {
    static associate(models) {
      Categoria.hasMany(models.Categoria, {
        as: 'subcategorias',
        foreignKey: 'categoria_padre_id',
      });
      Categoria.belongsTo(models.Categoria, {
        as: 'padre',
        foreignKey: 'categoria_padre_id',
      });
      Categoria.hasMany(models.Producto, {
        as: 'productos',
        foreignKey: 'categoria_id',
      });
    }
  }

  Categoria.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      categoria_padre_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      modelName: 'Categoria',
      tableName: 'categorias',
      underscored: true,
      timestamps: true,
    }
  );

  return Categoria;
};
