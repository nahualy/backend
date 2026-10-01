import app from './app.js';
import { sequelize } from './models/index.js';
import { inicializarWhatsApp } from './services/whatsapp.service.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

export const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión con la base de datos establecida exitosamente.');

    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });

    // Inicializar WhatsApp en segundo plano para no bloquear el arranque de la API
    inicializarWhatsApp().catch((err) => {
      console.error('Error al inicializar WhatsApp Web:', err.message);
    });
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error.message);
    process.exit(1);
  }
};

export default startServer;
