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

      console.log('🔄 Código recibido, intercambiando por refresh token...');
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      let userEmail = 'KarlaMarch18@gmail.com';
      try {
        const userInfo = await oAuth2Client.request({
          url: 'https://www.googleapis.com/oauth2/v2/userinfo',
        });
        if (userInfo.data && userInfo.data.email) {
          userEmail = userInfo.data.email;
        }
      } catch (_) {}

      if (tokens.refresh_token) {
        console.log('\n✅ ¡REFRESH TOKEN OBTENIDO CON ÉXITO!\n');
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
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #2e7d32;">¡Autorización exitosa! 🎉</h1>
            <p>Se ha generado y guardado tu <strong>GOOGLE_REFRESH_TOKEN</strong> y <strong>GOOGLE_EMAIL_REMITENTE</strong> en el archivo .env.</p>
            <p>Ya puedes cerrar esta pestaña y volver a tu terminal.</p>
          </div>
        `);

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1500);
      } else {
        console.warn('⚠️ No se devolvió refresh_token. Google solo lo envía la primera vez o con prompt="consent".');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>No se recibió un nuevo refresh_token. Intenta revocar los permisos previos en tu cuenta de Google.</h2>');
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
    console.log('\n======================================================\n');
  });
}

main();
