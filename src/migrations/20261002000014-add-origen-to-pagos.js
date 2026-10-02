/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_pagos_origen" AS ENUM ('checkout_publico', 'manual_whatsapp');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.addColumn('pagos', 'origen', {
      type: Sequelize.ENUM('checkout_publico', 'manual_whatsapp'),
      allowNull: false,
      defaultValue: 'checkout_publico',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('pagos', 'origen');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pagos_origen";');
  },
};
