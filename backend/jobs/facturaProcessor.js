/**
 * jobs/facturaProcessor.js
 * Disparador Cron — cada 40 segundos
 *
 * Flujo:
 *  1. Llama a driveServer y gmailServer para obtener archivos/adjuntos NUEVOS (post BOOT_TIME)
 *  2. Calcula MD5 → descarta duplicados
 *  3. Llama al OCR con IA para extraer campos de factura
 *  4. Persiste en tabla `facturas` con canal y estado
 *  5. Loguea errores por etapa sin detener el ciclo
 */

'use strict';

const crypto     = require('crypto');
const logger     = require('../services/loggerService');
const { extractInvoiceData } = require('../services/ocrService');
const driveServer = require('../mcp/driveServer');
const gmailServer = require('../mcp/gmailServer');
const Factura     = require('../models/Factura');

// ── Momento de arranque del servidor ────────────────────────────────────────
const BOOT_TIME = new Date();
logger.info(`[FacturaProcessor] BOOT_TIME registrado: ${BOOT_TIME.toISOString()}`);

// ── Intervalo: 40 segundos ───────────────────────────────────────────────────
const INTERVAL_MS = parseInt(process.env.CRON_INTERVAL_MS, 10) || 40_000;

let running = false; // semáforo para evitar ejecuciones solapadas

/**
 * Calcula MD5 de un Buffer.
 * @param {Buffer} buffer
 * @returns {string}
 */
function md5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Verifica si el hash ya existe en la BD (anti-duplicado).
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function isDuplicate(hash) {
  const existing = await Factura.findOne({ where: { hashMd5: hash } });
  if (existing && existing.estado === 'PROCESSED') {
    return true;
  }
  return false;
}

/**
 * Mapea los campos extraídos por OCR al formato del modelo Factura.
 */
function mapOcrToFactura(ocr, canal, origenId, filename, mimeType, hashMd5) {
  return {
    canal,
    origenId,
    filename,
    mimeType,
    hashMd5,
    proveedor:        ocr.proveedor        || null,
    rucProveedor:     ocr.ruc_proveedor    || null,
    cliente:          ocr.cliente          || null,
    rucCliente:       ocr.ruc_cliente      || null,
    numeroFactura:    ocr.numero_factura   || null,
    fechaEmision:     ocr.fecha_emision    || null,
    fechaVencimiento: ocr.fecha_vencimiento|| null,
    moneda:           ocr.moneda           || 'CRC',
    subtotal:         parseDecimal(ocr.subtotal),
    impuestos:        parseDecimal(ocr.impuestos),
    descuentos:       parseDecimal(ocr.descuentos),
    total:            parseDecimal(ocr.total),
    tipoDocumento:    ocr.tipo_documento   || 'factura',
    descripcion:      ocr.descripcion      || null,
    estado:           'PROCESSED',
    rawOcr:           ocr,
  };
}

function parseDecimal(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Procesa un único documento (buffer + metadatos).
 */
async function processDocument({ buffer, name, mimeType, canal, origenId }) {
  const hash = md5(buffer);

  // Buscar si ya existe el registro con ese hash (para re-intentar en caso de ERROR)
  const existing = await Factura.findOne({ where: { hashMd5: hash } });
  if (existing && existing.estado === 'PROCESSED') {
    logger.info(`[FacturaProcessor] Duplicado omitido: '${name}' (${hash})`);
    return;
  }

  let factura = existing;
  try {
    // ── OCR estructurado ───────────────────────────────────────────────────────
    const ocr = await extractInvoiceData(buffer, mimeType, name);

    if (ocr?.error === 'no_es_factura') {
      logger.warn(`[FacturaProcessor] '${name}' no es una factura, omitido.`);
      if (factura) {
        await factura.destroy();
      }
      return;
    }

    const data = mapOcrToFactura(ocr, canal, origenId, name, mimeType, hash);
    if (factura) {
      await factura.update(data);
    } else {
      factura = await Factura.create(data);
    }

    logger.info(
      `[FacturaProcessor] ✅ GUARDADO — ID: ${factura.id} | ` +
      `Canal: ${canal} | Nº: ${factura.numeroFactura} | Total: ${factura.total}`
    );

  } catch (err) {
    logger.error(`[FacturaProcessor] ❌ ERROR en '${name}': ${err.message}`, { stack: err.stack });

    // Guardar registro de error para auditoría
    try {
      if (factura) {
        await factura.update({
          estado: 'ERROR',
          errorDetalle: err.message,
          rawOcr: null,
        });
      } else {
        await Factura.create({
          canal,
          origenId,
          filename:    name,
          mimeType,
          hashMd5:     hash,
          estado:      'ERROR',
          errorDetalle: err.message,
          rawOcr:      null,
        });
      }
    } catch (dbErr) {
      logger.error(`[FacturaProcessor] ❌ No se pudo persistir el ERROR: ${dbErr.message}`);
    }
  }
}

/**
 * Ciclo principal de procesamiento.
 */
async function runCycle() {
  if (running) {
    logger.warn('[FacturaProcessor] Ciclo anterior aún en ejecución, saltando...');
    return;
  }
  running = true;

  logger.info(`[FacturaProcessor] ▶ Iniciando ciclo (BOOT_TIME: ${BOOT_TIME.toISOString()})`);

  // ── Google Drive ────────────────────────────────────────────────────────────
  try {
    const driveFiles = await driveServer.fetchNewFiles(BOOT_TIME);
    for (const file of driveFiles) {
      await processDocument({
        buffer:   file.buffer,
        name:     file.name,
        mimeType: file.mimeType,
        canal:    'drive',
        origenId: file.id,
      });
    }
  } catch (err) {
    logger.error(`[FacturaProcessor] ❌ Falla en etapa Drive: ${err.message}`, { stack: err.stack });
  }

  // ── Gmail ───────────────────────────────────────────────────────────────────
  try {
    const gmailAttachments = await gmailServer.fetchNewAttachments(BOOT_TIME);
    for (const att of gmailAttachments) {
      await processDocument({
        buffer:   att.buffer,
        name:     att.name,
        mimeType: att.mimeType,
        canal:    'gmail',
        origenId: att.messageId,
      });
    }
  } catch (err) {
    logger.error(`[FacturaProcessor] ❌ Falla en etapa Gmail: ${err.message}`, { stack: err.stack });
  }

  running = false;
  logger.info('[FacturaProcessor] ■ Ciclo completado.');
}

/**
 * Arranca el scheduler.
 * Llamar una vez desde server.js después de que la BD esté lista.
 */
function startScheduler() {
  logger.info(`[FacturaProcessor] Scheduler iniciado — intervalo: ${INTERVAL_MS}ms`);
  // Primera ejecución inmediata
  runCycle();
  // Ejecuciones periódicas
  setInterval(runCycle, INTERVAL_MS);
}

module.exports = { startScheduler };
