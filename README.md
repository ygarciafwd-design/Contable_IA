# Smart Accounting AI — v2.0
**Asistente Contable Inteligente con IA**

---

## Novedades v2.0 — Automatización Drive + Gmail

| Módulo | Archivo | Descripción |
|---|---|---|
| MCP Drive | `backend/mcp/driveServer.js` | OAuth2 + descarga archivos nuevos post-BOOT_TIME |
| MCP Gmail | `backend/mcp/gmailServer.js` | OAuth2 + extrae adjuntos de correos nuevos |
| Scheduler | `backend/jobs/facturaProcessor.js` | Cron cada 40 s, filtro BOOT_TIME, anti-duplicado MD5 |
| OCR IA | `backend/services/ocrService.js` | Claude extrae 14 campos estructurados de facturas |
| Modelo | `backend/models/Factura.js` | Sequelize con hash MD5, canal, estado, rawOcr |
| Logger | `backend/services/loggerService.js` | Winston — consola + archivos rotativos |
| API | `GET /api/facturas` | Lista paginada con filtros (canal, estado, proveedor, fechas) |
| Migración | `backend/config/migrateFacturas.js` | Crea/actualiza tabla `facturas` |

---

## Flujo de procesamiento

```
BOOT_TIME (arranque del servidor)
        │
        ▼  cada 40 segundos
┌───────────────────────────────┐
│     facturaProcessor.js       │
│                               │
│  driveServer.fetchNewFiles()  │──► archivos PDF/imagen subidos después de BOOT_TIME
│  gmailServer.fetchNewAttach() │──► adjuntos en correos recibidos después de BOOT_TIME
│                               │
│  md5(buffer) → ¿duplicado?   │──► SI: omitir
│                               │
│  ocrService.extractInvoice()  │──► Claude extrae campos estructurados
│                               │
│  Factura.create(data)         │──► estado: PROCESSED ✅ o ERROR ❌
└───────────────────────────────┘
        │
        ▼
  GET /api/facturas  ◄── Frontend React consume este endpoint
```

---

## Campos extraídos por OCR

| Campo | Tipo | Descripción |
|---|---|---|
| proveedor | string | Nombre del emisor |
| rucProveedor | string | RUC/NIT/CIF del proveedor |
| cliente | string | Nombre del receptor |
| rucCliente | string | RUC/NIT del cliente |
| numeroFactura | string | Número o folio |
| fechaEmision | date | YYYY-MM-DD |
| fechaVencimiento | date | YYYY-MM-DD |
| moneda | string | CRC, USD, EUR… |
| subtotal | decimal | Sin símbolo de moneda |
| impuestos | decimal | IVA / IGV / TAX |
| descuentos | decimal | Descuentos aplicados |
| total | decimal | Total final |
| tipoDocumento | enum | factura / nota_credito / nota_debito / recibo / otro |
| descripcion | text | Descripción breve de bienes/servicios |

Campos de sistema: `canal`, `estado`, `hashMd5`, `origenId`, `errorDetalle`, `rawOcr`

---

## Instalación

```bash
cd backend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Generar Google Refresh Token (solo una vez)
npm run token:google

# Crear tabla facturas
npm run migrate:facturas

# Iniciar servidor (incluye el scheduler automáticamente)
npm run dev
```

---

## Endpoint GET /api/facturas

**Requiere JWT en header:** `Authorization: Bearer <token>`

```
GET /api/facturas?page=1&limit=20&canal=gmail&estado=PROCESSED&proveedor=Empresa&desde=2025-01-01&hasta=2025-12-31
```

**Respuesta:**
```json
{
  "ok": true,
  "meta": { "total": 42, "page": 1, "limit": 20, "pages": 3 },
  "data": [ { ...camposFactura } ]
}
```

---

## Variables de entorno requeridas (nuevas en v2)

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
GOOGLE_REFRESH_TOKEN=...
CRON_INTERVAL_MS=40000
LOG_LEVEL=info
```

---

## Stack

- **Backend:** Node.js · Express · Sequelize · MySQL
- **IA / OCR:** Claude claude-sonnet-4-20250514 (Anthropic SDK)
- **Google APIs:** googleapis (Drive v3 + Gmail v1) con OAuth2
- **Logs:** Winston (consola + archivos rotativos en `/logs`)
- **Auth:** JWT · bcryptjs
- **Frontend:** React (carpeta `/frontend`)
