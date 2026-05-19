const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    defaultValue: 'Nueva conversación',
  },
  context: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Contexto acumulado de la conversación para la IA',
  },
  category: {
    type: DataTypes.ENUM('general', 'impuestos', 'nomina', 'reportes', 'bd_query', 'documentos'),
    defaultValue: 'general',
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  messageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'conversations',
});

module.exports = Conversation;
