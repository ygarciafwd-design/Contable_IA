/**
 * models/Factura.js
 * Modelo Sequelize — Factura
 *
 * Campos del diagrama + hash MD5 anti-duplicados + canal + estado.
 */

'use strict';

const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Factura = sequelize.define('Factura', {

  // ── Identificación ──────────────────────────────────────────────────────────
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
    comment:      'PK único universal',
  },

  // ── Trazabilidad de origen ──────────────────────────────────────────────────
  canal: {
    type:      DataTypes.ENUM('gmail', 'drive', 'upload_manual'),
    allowNull: false,
    comment:   'Fuente de ingreso del documento',
  },

  origenId: {
    type:      DataTypes.STRING(255),
    allowNull: true,
    comment:   'ID del mensaje (Gmail) o ID del archivo (Drive)',
  },

  filename: {
    type:      DataTypes.STRING(255),
    allowNull: false,
    comment:   'Nombre original del archivo',
  },

  mimeType: {
    type:      DataTypes.STRING(100),
    allowNull: false,
  },

  // ── Anti-duplicados ─────────────────────────────────────────────────────────
  hashMd5: {
    type:      DataTypes.STRING(32),
    allowNull: false,
    unique:    true,
    comment:   'MD5 del buffer del archivo para evitar procesar duplicados',
  },

  // ── Datos extraídos por IA / OCR ────────────────────────────────────────────
  proveedor: {
    type:      DataTypes.STRING(255),
    allowNull: true,
  },

  rucProveedor: {
    type:      DataTypes.STRING(50),
    allowNull: true,
    comment:   'RUC, NIT, CIF o número fiscal del proveedor',
  },

  cliente: {
    type:      DataTypes.STRING(255),
    allowNull: true,
  },

  rucCliente: {
    type:      DataTypes.STRING(50),
    allowNull: true,
  },

  numeroFactura: {
    type:      DataTypes.STRING(100),
    allowNull: true,
    comment:   'Número o folio de la factura según el documento',
  },

  fechaEmision: {
    type:      DataTypes.DATEONLY,
    allowNull: true,
  },

  fechaVencimiento: {
    type:      DataTypes.DATEONLY,
    allowNull: true,
  },

  moneda: {
    type:         DataTypes.STRING(10),
    allowNull:    true,
    defaultValue: 'CRC',
  },

  subtotal: {
    type:         DataTypes.DECIMAL(15, 2),
    allowNull:    true,
    defaultValue: 0,
  },

  impuestos: {
    type:         DataTypes.DECIMAL(15, 2),
    allowNull:    true,
    defaultValue: 0,
  },

  descuentos: {
    type:         DataTypes.DECIMAL(15, 2),
    allowNull:    true,
    defaultValue: 0,
  },

  total: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },

  tipoDocumento: {
    type:         DataTypes.ENUM('factura', 'nota_credito', 'nota_debito', 'recibo', 'otro'),
    defaultValue: 'factura',
  },

  descripcion: {
    type:      DataTypes.TEXT,
    allowNull: true,
    comment:   'Descripción de los bienes/servicios extraída por OCR',
  },

  // ── Estado de procesamiento ─────────────────────────────────────────────────
  estado: {
    type:         DataTypes.ENUM('PROCESSED', 'ERROR'),
    defaultValue: 'PROCESSED',
    allowNull:    false,
  },

  errorDetalle: {
    type:      DataTypes.TEXT,
    allowNull: true,
    comment:   'Mensaje de error si estado = ERROR',
  },

  // ── Raw OCR (para auditoría) ────────────────────────────────────────────────
  rawOcr: {
    type:      DataTypes.JSON,
    allowNull: true,
    comment:   'Respuesta completa del OCR antes de mapear campos',
  },

}, {
  tableName:  'facturas',
  timestamps: true,   // createdAt, updatedAt automáticos
  indexes: [
    { fields: ['hashMd5'],      unique: true },
    { fields: ['canal'] },
    { fields: ['estado'] },
    { fields: ['proveedor'] },
    { fields: ['fechaEmision'] },
    { fields: ['numeroFactura'] },
  ],
});

module.exports = Factura;
