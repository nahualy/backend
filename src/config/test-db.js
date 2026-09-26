import sequelize from './db.js';

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión con PostgreSQL exitosa vía Sequelize.');
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message);
  } finally {
    await sequelize.close();
  }
};

testConnection();
