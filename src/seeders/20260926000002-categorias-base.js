'use strict';
const { Categoria } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Nivel 1 (raíz, categoria_padre_id: null)
    const ropa = await Categoria.create({
      nombre: 'Ropa',
      categoria_padre_id: null,
      activo: true,
    });

    const papeleria = await Categoria.create({
      nombre: 'Papelería',
      categoria_padre_id: null,
      activo: true,
    });

    const mascota = await Categoria.create({
      nombre: 'Artículos para mascota',
      categoria_padre_id: null,
      activo: true,
    });

    // Nivel 2
    // Bajo "Ropa": Vestidos, Pantalones, Camisas, Blusas
    await Categoria.create({ nombre: 'Vestidos', categoria_padre_id: ropa.id, activo: true });
    await Categoria.create({ nombre: 'Pantalones', categoria_padre_id: ropa.id, activo: true });
    await Categoria.create({ nombre: 'Camisas', categoria_padre_id: ropa.id, activo: true });
    await Categoria.create({ nombre: 'Blusas', categoria_padre_id: ropa.id, activo: true });

    // Bajo "Papelería": Bolígrafos, Libretas, Post-it, Resaltadores
    await Categoria.create({ nombre: 'Bolígrafos', categoria_padre_id: papeleria.id, activo: true });
    await Categoria.create({ nombre: 'Libretas', categoria_padre_id: papeleria.id, activo: true });
    await Categoria.create({ nombre: 'Post-it', categoria_padre_id: papeleria.id, activo: true });
    await Categoria.create({ nombre: 'Resaltadores', categoria_padre_id: papeleria.id, activo: true });

    // Bajo "Artículos para mascota": Víveres básicos, Accesorios
    const viveres = await Categoria.create({
      nombre: 'Víveres básicos',
      categoria_padre_id: mascota.id,
      activo: true,
    });

    const accesorios = await Categoria.create({
      nombre: 'Accesorios',
      categoria_padre_id: mascota.id,
      activo: true,
    });

    // Nivel 3
    // Bajo "Víveres básicos": Comida, Gatarina/Perrarina, Arena para gatos, Premios, Churus
    await Categoria.create({ nombre: 'Comida', categoria_padre_id: viveres.id, activo: true });
    await Categoria.create({ nombre: 'Gatarina/Perrarina', categoria_padre_id: viveres.id, activo: true });
    await Categoria.create({ nombre: 'Arena para gatos', categoria_padre_id: viveres.id, activo: true });
    await Categoria.create({ nombre: 'Premios', categoria_padre_id: viveres.id, activo: true });
    await Categoria.create({ nombre: 'Churus', categoria_padre_id: viveres.id, activo: true });

    // Bajo "Accesorios": Cuencos, Collares, Juguetes, Areneros
    await Categoria.create({ nombre: 'Cuencos', categoria_padre_id: accesorios.id, activo: true });
    await Categoria.create({ nombre: 'Collares', categoria_padre_id: accesorios.id, activo: true });
    await Categoria.create({ nombre: 'Juguetes', categoria_padre_id: accesorios.id, activo: true });
    await Categoria.create({ nombre: 'Areneros', categoria_padre_id: accesorios.id, activo: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categorias', null, {});
  },
};
