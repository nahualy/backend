'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('CAMBIAR_ESTA_CLAVE', saltRounds);

    await queryInterface.bulkInsert(
      'usuarios',
      [
        {
          nombre_completo: 'Administrador',
          email: 'admin@chiringuitodelukas.com',
          password_hash: passwordHash,
          rol: 'admin',
          activo: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('usuarios', { email: 'admin@chiringuitodelukas.com' }, {});
  },
};
