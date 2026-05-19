const sequelize    = require('../config/database');
const User         = require('./User');
const Role         = require('./Role');
const Conversation = require('./Conversation');
const Message      = require('./Message');
const Document     = require('./Document');
const AuditLog     = require('./AuditLog');
const Factura      = require('./Factura');

// Asociaciones
User.belongsTo(Role, { foreignKey: 'roleId', as: 'roleRelation' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

User.hasMany(Conversation, { foreignKey: 'userId', as: 'conversations', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { sequelize, User, Role, Conversation, Message, Document, AuditLog, Factura };
