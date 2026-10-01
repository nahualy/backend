import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { normalizarTelefono } from '../utils/whatsapp.util.js';

let client = null;
let isInitializing = false;
let isReady = false;

export const inicializarWhatsApp = async () => {
  if (client && (isReady || isInitializing)) {
    return;
  }

  isInitializing = true;

  try {
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: '.wwebjs_auth',
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    client.on('qr', (qr) => {
      console.log('\n=============================================');
      console.log('📱 Escanea este código QR con WhatsApp en tu celular:');
      qrcode.generate(qr, { small: true });
      console.log('=============================================\n');
    });

    client.on('ready', () => {
      isReady = true;
      isInitializing = false;
      console.log('✅ WhatsApp conectado y listo para enviar mensajes');
    });

    client.on('authenticated', () => {
      console.log('🔐 Sesión de WhatsApp autenticada correctamente');
    });

    client.on('auth_failure', (msg) => {
      console.error('❌ Error de autenticación de WhatsApp:', msg);
      isReady = false;
      isInitializing = false;
    });

    client.on('disconnected', (reason) => {
      console.warn('⚠️ WhatsApp desconectado:', reason);
      isReady = false;
      isInitializing = false;
    });

    await client.initialize();
  } catch (error) {
    isInitializing = false;
    isReady = false;
    console.error('❌ Error al inicializar cliente de WhatsApp:', error.message);
  }
};

export const enviarWhatsApp = async (telefono, mensaje) => {
  try {
    if (!client || !client.info) {
      console.warn('⚠️ Intento de envío de WhatsApp pero el cliente no está listo');
      return { exito: false, error: 'WhatsApp no está conectado' };
    }

    const numero = normalizarTelefono(telefono);
    if (!numero) {
      return { exito: false, error: 'Número de teléfono inválido' };
    }

    const chatId = `${numero}@c.us`;
    await client.sendMessage(chatId, mensaje);
    return { exito: true };
  } catch (error) {
    console.error(`❌ Error enviando WhatsApp a ${telefono}:`, error.message);
    return { exito: false, error: error.message };
  }
};

export default {
  inicializarWhatsApp,
  enviarWhatsApp,
};
