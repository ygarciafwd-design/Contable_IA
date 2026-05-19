/**
 * scripts/generateGoogleToken.js
 * Genera el GOOGLE_REFRESH_TOKEN para Drive + Gmail.
 *
 * Uso (una sola vez, en tu máquina local):
 *   node scripts/generateGoogleToken.js
 *
 * Luego copia el refresh_token al .env.
 */

'use strict';

require('dotenv').config();
const { google } = require('googleapis');
const readline   = require('readline');

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI   // Debe ser http://localhost:3001/auth/google/callback
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt:      'consent',
  scope:       SCOPES,
});

console.log('\n📋 Abre esta URL en tu navegador:\n');
console.log(authUrl);
console.log('\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('📌 Pega el código de autorización aquí: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log('\n✅ Tokens obtenidos:');
    console.log(JSON.stringify(tokens, null, 2));
    console.log('\n👉 Copia el campo "refresh_token" en tu .env como GOOGLE_REFRESH_TOKEN\n');
  } catch (err) {
    console.error('❌ Error al obtener tokens:', err.message);
  }
});
