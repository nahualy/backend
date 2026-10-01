import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const OAuth2 = google.auth.OAuth2;

export const enviarCorreo = async (destinatario, asunto, mensajeHtml) => {
  try {
    if (!destinatario || typeof destinatario !== 'string' || !destinatario.trim()) {
      return { exito: false, error: 'Sin destinatario' };
    }

    const {
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN,
      GOOGLE_EMAIL_REMITENTE,
    } = process.env;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !GOOGLE_EMAIL_REMITENTE) {
      console.warn('⚠️ Credenciales de Google OAuth2 incompletas en las variables de entorno para envío de email.');
      return { exito: false, error: 'Credenciales de correo incompletas en .env' };
    }

    const oauth2Client = new OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: GOOGLE_REFRESH_TOKEN,
    });

    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = typeof accessTokenResponse === 'string'
      ? accessTokenResponse
      : accessTokenResponse?.token;

    if (!accessToken) {
      return { exito: false, error: 'No se pudo generar el access token de Google' };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: GOOGLE_EMAIL_REMITENTE,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN,
        accessToken,
      },
    });

    const mailOptions = {
      from: `"El Chiringuito de Lukas" <${GOOGLE_EMAIL_REMITENTE}>`,
      to: destinatario.trim(),
      subject: asunto,
      html: mensajeHtml,
    };

    await transporter.sendMail(mailOptions);
    return { exito: true };
  } catch (error) {
    console.error(`❌ Error enviando correo a ${destinatario}:`, error.message);
    return { exito: false, error: error.message };
  }
};

export default {
  enviarCorreo,
};
