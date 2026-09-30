import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import readline from 'readline';

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

function pedirCodigo(pregunta) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

async function generarRefreshToken() {
  console.log('\n======================================================');
  console.log(' Generador de Refresh Token de Google OAuth2 (Gmail) ');
  console.log('======================================================\n');

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Error: Debes configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en tu archivo .env');
    process.exit(1);
  }

  const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send'],
    prompt: 'consent',
  });

  console.log('Abre esta URL en tu navegador, inicia sesión con la cuenta de Gmail de la tienda, acepta los permisos, y copia el código que te muestre Google:');
  console.log(`\n${authUrl}\n`);

  try {
    const codigo = await pedirCodigo('Pega el código de autorización aquí: ');

    if (!codigo) {
      console.error('\n❌ No se proporcionó ningún código. Operación cancelada.\n');
      process.exit(1);
    }

    const { tokens } = await oAuth2Client.getToken(codigo);

    if (tokens.refresh_token) {
      console.log('\n======================================================');
      console.log(' ¡REFRESH TOKEN GENERADO CON ÉXITO! ');
      console.log('======================================================\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      console.log('Copia este valor y pégalo en tu .env como GOOGLE_REFRESH_TOKEN (nunca lo compartas ni lo subas a git).\n');
    } else {
      console.log('\n⚠️ No se recibió un refresh_token en la respuesta.');
      console.log('Esto suele suceder si la cuenta ya había otorgado permisos previamente.');
      console.log('Revoca el acceso previo en https://myaccount.google.com/permissions o asegúrate de que prompt sea "consent".\n');
    }
  } catch (error) {
    console.error('\n❌ Error al obtener el token:');
    if (error.response && error.response.data && error.response.data.error_description) {
      console.error(`Detalle: ${error.response.data.error_description}`);
    } else if (error.message) {
      console.error(`Detalle: ${error.message}`);
    } else {
      console.error('Código de autorización inválido o credenciales incorrectas.');
    }
    console.error('Verifica que el código no haya expirado y que tus credenciales en el archivo .env sean correctas.\n');
  }
}

generarRefreshToken();
