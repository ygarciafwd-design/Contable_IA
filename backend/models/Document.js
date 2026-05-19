const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  extractedText: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Resumen generado por IA del documento',
  },
  category: {
    type: DataTypes.ENUM('factura', 'balance', 'nomina', 'impuesto', 'contrato', 'otro'),
    defaultValue: 'otro',
  },
  isProcessed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'documents',
});

module.exports = Document;
