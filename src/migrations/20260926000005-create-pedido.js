'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pedidos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nombre_cliente: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      telefono_cliente: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      direccion_entrega: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      estado: {
        type: Sequelize.ENUM('pendiente', 'confirmado', 'en_proceso', 'entregado', 'cancelado'),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      notas: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pedidos');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pedidos_estado";');
  },
};
