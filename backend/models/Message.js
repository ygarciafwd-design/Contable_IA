const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant', 'system'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('text', 'sql_query', 'sql_result', 'report', 'error', 'voice'),
    defaultValue: 'text',
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'SQL generado, resultados de BD, tokens usados, etc.',
  },
  audioUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL del audio TTS generado',
  },
  tokensUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  processingTime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Tiempo de procesamiento en ms',
  },
}, {
  tableName: 'messages',
});

module.exports = Message;
