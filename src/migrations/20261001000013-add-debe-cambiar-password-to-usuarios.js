/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('usuarios', 'debe_cambiar_password', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.sequelize.query(
      "UPDATE usuarios SET debe_cambiar_password = false WHERE rol = 'admin';"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('usuarios', 'debe_cambiar_password');
  },
};
