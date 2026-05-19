/**
 * services/ocrService.js
 * Extracción estructurada de facturas con IA (Claude claude-sonnet-4-20250514).
 * Soporta PDF (via pdf-parse) e imágenes (base64 vision).
 * Retorna un objeto con los campos estándar de factura.
 */

'use strict';

const Anthropic  = require('@anthropic-ai/sdk');
const pdfParse   = require('pdf-parse');
const logger     = require('./loggerService');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Prompt de extracción ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un sistema OCR especializado en facturas comerciales y fiscales.
Tu única tarea es extraer campos de una factura y responder ÚNICAMENTE con un objeto JSON válido.
No escribas ningún texto fuera del JSON.

Campos a extraer (usa null si no se encuentra el dato):
{
  "proveedor":        "Nombre completo del emisor/proveedor",
  "ruc_proveedor":    "RUC, NIT, CIF o número fiscal del proveedor",
  "cliente":          "Nombre del receptor/cliente",
  "ruc_cliente":      "RUC/NIT del cliente",
  "numero_factura":   "Número o folio de la factura",
  "fecha_emision":    "Fecha de emisión en formato YYYY-MM-DD",
  "fecha_vencimiento":"Fecha de vencimiento en formato YYYY-MM-DD",
  "moneda":           "Código de moneda (CRC, USD, EUR, etc.)",
  "subtotal":         número sin símbolo de moneda,
  "impuestos":        número sin símbolo de moneda,
  "descuentos":       número sin símbolo de moneda,
  "total":            número sin símbolo de moneda,
  "tipo_documento":   "factura | nota_credito | nota_debito | recibo | otro",
  "descripcion":      "Breve descripción de los bienes o servicios (máx 200 chars)"
}

Si un campo numérico aparece como "1.234,56" conviértelo a 1234.56 (punto decimal).
Si no puedes identificar el documento como una factura, devuelve: {"error": "no_es_factura"}`;

/**
 * Extrae campos de factura de un buffer PDF o imagen.
 * @param {Buffer} buffer
 * @param {string} mimeType  - 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
 * @param {string} filename  - Solo para logging
 * @returns {Promise<Object>} - Campos extraídos o {error: string}
 */
async function extractInvoiceData(buffer, mimeType, filename = 'documento') {
  logger.info(`[OCR] Procesando: '${filename}' (${mimeType})`);

  let content;

  try {
    if (mimeType === 'application/pdf') {
      // PDF → texto plano → enviar como texto al LLM
      const parsed = await pdfParse(buffer);
      const text   = parsed.text?.trim() || '';

      if (!text) {
        logger.warn(`[OCR] PDF sin texto extraíble en '${filename}', intentando como imagen...`);
        // Si el PDF es escaneado (imagen), Claude no puede procesar el PDF como visión directo;
        // fallback: informar al modelo con el contenido binario base64 como documento
        content = buildPdfDocumentContent(buffer);
      } else {
        content = [{ type: 'text', text: `CONTENIDO DEL DOCUMENTO:\n\n${text}` }];
      }
    } else {
      // Imagen → base64 vision
      content = [
        {
          type:   'image',
          source: {
            type:       'base64',
            media_type: mimeType,
            data:       buffer.toString('base64'),
          },
        },
        { type: 'text', text: 'Extrae los campos de esta factura.' },
      ];
    }

    const response = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content }],
    });

    const raw = response.content?.[0]?.text?.trim() || '{}';
    const data = safeParseJSON(raw, filename);

    if (data?.error) {
      logger.warn(`[OCR] '${filename}' no identificado como factura: ${data.error}`);
    } else {
      logger.info(`[OCR] ✅ Factura extraída: nº ${data.numero_factura} | Total ${data.total}`);
    }

    return data;

  } catch (err) {
    logger.error(`[OCR] ❌ Error procesando '${filename}': ${err.message}`, { stack: err.stack });
    throw err;
  }
}

/** Construye content block para PDF binario (cuando pdfParse no extrae texto). */
function buildPdfDocumentContent(buffer) {
  return [
    {
      type:   'document',
      source: {
        type:       'base64',
        media_type: 'application/pdf',
        data:       buffer.toString('base64'),
      },
    },
    { type: 'text', text: 'Extrae los campos de esta factura.' },
  ];
}

/** Parsea JSON con limpieza de posibles markdown fences. */
function safeParseJSON(raw, filename) {
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    logger.error(`[OCR] JSON inválido recibido para '${filename}': ${raw.slice(0, 200)}`);
    return { error: 'json_invalido', raw };
  }
}

module.exports = { extractInvoiceData };
