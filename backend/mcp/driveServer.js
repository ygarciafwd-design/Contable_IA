/**
 * mcp/driveServer.js
 * MCP Client — Google Drive
 * Descarga archivos nuevos (PDF/imagen) subidos después de BOOT_TIME.
 * Usa OAuth2 via googleapis.
 */

'use strict';

require('dotenv').config();
const { google }  = require('googleapis');
const fs          = require('fs');
const path        = require('path');
const logger      = require('../services/loggerService');

// ── OAuth2 client ─────────────────────────────────────────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// ── Tipos MIME aceptados (facturas en PDF o imagen) ───────────────────────────
const ACCEPTED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

/**
 * Retorna archivos de Google Drive subidos DESPUÉS de BOOT_TIME.
 * @param {Date} bootTime - Momento de arranque del servidor.
 * @returns {Promise<Array<{id, name, mimeType, buffer}>>}
 */
async function fetchNewFiles(bootTime) {
  const scanStart = new Date(bootTime.getTime() - 2 * 60 * 60 * 1000); // Buscar últimas 2 horas
  const since = scanStart.toISOString();

  logger.info(`[DriveServer] Buscando archivos nuevos desde ${since} (últimas 2 horas)`);

  let files = [];
  try {
    const res = await drive.files.list({
      q: `modifiedTime > '${since}' and trashed = false`,
      fields: 'files(id, name, mimeType, modifiedTime)',
      orderBy: 'modifiedTime asc',
      pageSize: 50,
    });
    files = (res.data.files || []).filter(f => ACCEPTED_MIME.includes(f.mimeType));
  } catch (err) {
    logger.error(`[DriveServer] Error al listar archivos: ${err.message}`, { stack: err.stack });
    throw err;
  }

  logger.info(`[DriveServer] ${files.length} archivo(s) encontrado(s).`);

  const results = [];
  for (const file of files) {
    try {
      const stream = await drive.files.get(
        { fileId: file.id, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      results.push({
        id:       file.id,
        name:     file.name,
        mimeType: file.mimeType,
        buffer:   Buffer.from(stream.data),
      });
      logger.info(`[DriveServer] ✅ Descargado: ${file.name}`);
    } catch (err) {
      logger.error(`[DriveServer] ❌ Error al descargar '${file.name}': ${err.message}`);
      // Continúa con los demás archivos aunque uno falle
    }
  }

  return results;
}

module.exports = { fetchNewFiles };
