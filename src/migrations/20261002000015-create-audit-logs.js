/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      accion: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      entidad: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      entidad_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      datos_anteriores: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      datos_nuevos: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ip_origen: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Índices para optimizar consultas comunes de auditoría
    await queryInterface.addIndex('audit_logs', ['created_at']);
    await queryInterface.addIndex('audit_logs', ['usuario_id']);
    await queryInterface.addIndex('audit_logs', ['entidad', 'entidad_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  },
};
