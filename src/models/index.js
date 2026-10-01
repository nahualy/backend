import { Sequelize, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

import defineUsuario from './Usuario.js';
import defineCategoria from './Categoria.js';
import defineProducto from './Producto.js';
import definePedido from './Pedido.js';
import defineDetallePedido from './DetallePedido.js';
import definePago from './Pago.js';

const db = {};

const modelDefinitions = [
  defineUsuario,
  defineCategoria,
  defineProducto,
  definePedido,
  defineDetallePedido,
  definePago,
];

modelDefinitions.forEach((defineModel) => {
  const model = defineModel(sequelize, DataTypes);
  db[model.name] = model;
});

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export const {
  Usuario,
  Categoria,
  Producto,
  Pedido,
  DetallePedido,
  Pago,
} = db;

export { sequelize, Sequelize };
export default db;
