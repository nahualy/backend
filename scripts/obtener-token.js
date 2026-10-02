import dotenv from 'dotenv';
import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 4500;
const REDIRECT_URI = `http://localhost:${PORT}`;

async function main() {
  console.log('\n======================================================');
  console.log(' Generador Automático de Refresh Token de Gmail OAuth2 ');
  console.log('======================================================\n');

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Error: Debes configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en tu archivo .env');
    process.exit(1);
  }

  const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url, true);
      const code = parsedUrl.query.code;

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>No se recibió el código de autorización de Google.</h2>');
        return;
      }

      console.log('🔄 Código recibido de Google, verificando permisos...');
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      const scopesGranted = tokens.scope || '';
      console.log('📋 Permisos otorgados:', scopesGranted);

      if (!scopesGranted.includes('gmail.send')) {
        console.warn('⚠️ ATENCIÓN: El usuario NO marcó la casilla de permisos "gmail.send".');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 2px solid #d32f2f; border-radius: 10px; background-color: #ffebee; text-align: center;">
            <h1 style="color: #c62828;">⚠️ Faltó marcar la casilla de permiso</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.5;">
              En la pantalla de consentimiento de Google, <strong>NO marcaste la casilla</strong>:
            </p>
            <div style="background: white; border: 1px dashed #c62828; padding: 15px; border-radius: 8px; margin: 20px 0; font-weight: bold; color: #b71c1c;">
              ☑️ "Enviar correos electrónicos en tu nombre"
            </div>
            <p style="font-size: 15px; color: #555;">
              Google deja esta casilla desmarcada por seguridad. Debes hacer clic en ella para marcarla antes de presionar Continuar.
            </p>
            <a href="${authUrl}" style="display: inline-block; margin-top: 15px; padding: 12px 24px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              🔄 Reintentar y marcar la casilla
            </a>
          </div>
        `);
        return;
      }

      let userEmail = process.env.GOOGLE_EMAIL_REMITENTE || 'arochaedtecnica@gmail.com';
      try {
        const userInfo = await oAuth2Client.request({
          url: 'https://www.googleapis.com/oauth2/v2/userinfo',
        });
        if (userInfo.data && userInfo.data.email) {
          userEmail = userInfo.data.email;
        }
      } catch (_) {}

      if (tokens.refresh_token) {
        console.log('\n✅ ¡REFRESH TOKEN OBTENIDO CON PERMISO GMAIL.SEND!\n');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log(`GOOGLE_EMAIL_REMITENTE=${userEmail}\n`);

        const envPath = path.resolve(process.cwd(), '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

        if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
          envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        } else {
          envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`;
        }

        if (envContent.includes('GOOGLE_EMAIL_REMITENTE=')) {
          envContent = envContent.replace(/GOOGLE_EMAIL_REMITENTE=.*/g, `GOOGLE_EMAIL_REMITENTE=${userEmail}`);
        } else {
          envContent += `\nGOOGLE_EMAIL_REMITENTE=${userEmail}`;
        }

        fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
        console.log('💾 Credenciales guardadas automáticamente en tu archivo .env!\n');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 2px solid #2e7d32; border-radius: 10px; background-color: #e8f5e9; text-align: center;">
            <h1 style="color: #2e7d32;">¡Autorización exitosa! 🎉</h1>
            <p style="font-size: 16px; color: #2e7d32; font-weight: bold;">
              Permiso de envío de correos verificado y activo.
            </p>
            <p style="color: #333;">Se ha guardado tu <strong>GOOGLE_REFRESH_TOKEN</strong> y <strong>GOOGLE_EMAIL_REMITENTE</strong> (${userEmail}) en el archivo .env.</p>
            <p style="color: #666; font-size: 14px;">Ya puedes cerrar esta pestaña y regresar a la terminal.</p>
          </div>
        `);

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1500);
      } else {
        console.warn('⚠️ No se devolvió refresh_token. Google solo lo envía con prompt="consent".');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">
            <h2>No se recibió un nuevo refresh_token.</h2>
            <p>Intenta revocar el acceso anterior en <a href="https://myaccount.google.com/permissions" target="_blank">tu cuenta de Google</a> y vuelve a intentarlo.</p>
          </div>
        `);
      }
    } catch (err) {
      console.error('❌ Error intercambiando código:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>Error: ${err.message}</h2>`);
    }
  });

  server.listen(PORT, () => {
    console.log(`📡 Servidor de autorización escuchando en http://localhost:${PORT}`);
    console.log('👉 Abre este enlace en tu navegador para autorizar Gmail:\n');
    console.log(authUrl);
    console.log('\n⚠️ IMPORTANTE: En la pantalla de permisos de Google, asegúrate de MARCAR la casilla que dice "Enviar correos electrónicos en tu nombre".');
    console.log('======================================================\n');
  });
}

main();
