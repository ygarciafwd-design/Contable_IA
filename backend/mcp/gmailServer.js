/**
 * mcp/gmailServer.js
 * MCP Client — Gmail
 * Busca correos con adjuntos (PDF/imagen) recibidos después de BOOT_TIME.
 * Usa OAuth2 via googleapis.
 */

'use strict';

require('dotenv').config();
const { google } = require('googleapis');
const logger     = require('../services/loggerService');

// ── OAuth2 client ─────────────────────────────────────────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Tipos MIME aceptados en adjuntos
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * Convierte una fecha a epoch en segundos para la query de Gmail.
 */
function toEpochSec(date) {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Retorna adjuntos de correos recibidos DESPUÉS de BOOT_TIME.
 * @param {Date} bootTime
 * @returns {Promise<Array<{messageId, subject, from, name, mimeType, buffer}>>}
 */
async function fetchNewAttachments(bootTime) {
  const after = toEpochSec(bootTime);

  logger.info(`[GmailServer] Buscando correos con adjuntos desde epoch ${after}`);

  // Buscar IDs de mensajes
  let messageIds = [];
  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `has:attachment after:${after}`,
      maxResults: 50,
    });
    messageIds = (res.data.messages || []).map(m => m.id);
  } catch (err) {
    logger.error(`[GmailServer] Error al listar mensajes: ${err.message}`, { stack: err.stack });
    throw err;
  }

  logger.info(`[GmailServer] ${messageIds.length} correo(s) con adjuntos encontrado(s).`);

  const results = [];

  for (const msgId of messageIds) {
    let msg;
    try {
      const res = await gmail.users.messages.get({ userId: 'me', id: msgId, format: 'full' });
      msg = res.data;
    } catch (err) {
      logger.error(`[GmailServer] ❌ Error al obtener mensaje ${msgId}: ${err.message}`);
      continue;
    }

    // Extraer metadatos del header
    const headers  = msg.payload?.headers || [];
    const subject  = headers.find(h => h.name === 'Subject')?.value || '(sin asunto)';
    const from     = headers.find(h => h.name === 'From')?.value    || '(desconocido)';

    // Recorrer partes del mensaje buscando adjuntos aceptados
    const parts = flattenParts(msg.payload?.parts || []);
    for (const part of parts) {
      if (!ACCEPTED_MIME.includes(part.mimeType)) continue;
      if (!part.body?.attachmentId)               continue;

      try {
        const attRes = await gmail.users.messages.attachments.get({
          userId:       'me',
          messageId:    msgId,
          id:           part.body.attachmentId,
        });

        // Gmail usa base64url
        const buffer = Buffer.from(attRes.data.data, 'base64url');

        results.push({
          messageId: msgId,
          subject,
          from,
          name:     part.filename || `adjunto_${msgId}`,
          mimeType: part.mimeType,
          buffer,
        });

        logger.info(`[GmailServer] ✅ Adjunto descargado: '${part.filename}' de '${from}'`);
      } catch (err) {
        logger.error(`[GmailServer] ❌ Error al descargar adjunto en ${msgId}: ${err.message}`);
      }
    }
  }

  return results;
}

/**
 * Aplana el árbol de partes MIME de Gmail de forma recursiva.
 */
function flattenParts(parts) {
  const flat = [];
  for (const part of parts) {
    flat.push(part);
    if (part.parts?.length) flat.push(...flattenParts(part.parts));
  }
  return flat;
}

module.exports = { fetchNewAttachments };
