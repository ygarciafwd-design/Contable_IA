const { Conversation, Message, Document } = require('../models');
const aiService = require('../services/aiService');
const { Op } = require('sequelize');

exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido.' });
    }

    // Obtener o crear conversación
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({
        where: { id: conversationId, userId: req.user.id },
      });
      if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada.' });
    } else {
      conversation = await Conversation.create({
        userId: req.user.id,
        title: message.substring(0, 60) + (message.length > 60 ? '...' : ''),
      });
    }

    // Guardar mensaje del usuario
    await Message.create({
      conversationId: conversation.id,
      role: 'user',
      content: message,
      type: 'text',
    });

    // Obtener historial reciente (últimos 20 mensajes)
    const history = await Message.findAll({
      where: { conversationId: conversation.id, role: { [Op.in]: ['user', 'assistant'] } },
      order: [['createdAt', 'ASC']],
      limit: 20,
    });

    // Obtener contexto de documentos del usuario
    const documents = await Document.findAll({
      where: { uploadedBy: req.user.id, isProcessed: true },
      attributes: ['originalName', 'summary'],
      limit: 3,
      order: [['createdAt', 'DESC']],
    });
    const documentContext = documents.map(d => `[${d.originalName}]: ${d.summary}`).join('\n\n');

    // Procesar con IA
    const result = await aiService.processMessage({
      userMessage: message,
      conversationHistory: history.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
      documentContext,
      user: req.user,
    });

    // Guardar respuesta del asistente
    const assistantMessage = await Message.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: result.message,
      type: result.type,
      metadata: {
        sqlExecuted: result.sqlExecuted,
        sqlResults: result.sqlResults,
      },
      tokensUsed: result.tokensUsed,
      processingTime: result.processingTime,
    });

    // Actualizar estadísticas de conversación
    await conversation.update({
      messageCount: conversation.messageCount + 2,
      lastMessageAt: new Date(),
      context: result.message.substring(0, 500),
    });

    res.json({
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        content: result.message,
        type: result.type,
        sqlExecuted: result.sqlExecuted,
        sqlResults: result.sqlResults,
        createdAt: assistantMessage.createdAt,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Error al procesar el mensaje.' });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.findAll({
      where: { userId: req.user.id, isArchived: false },
      order: [['lastMessageAt', 'DESC']],
      limit: 50,
    });
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener conversaciones.' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{
        association: 'messages',
        order: [['createdAt', 'ASC']],
      }],
    });
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada.' });
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener conversación.' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada.' });
    await conversation.update({ isArchived: true });
    res.json({ message: 'Conversación archivada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar conversación.' });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const { conversationId, reportType } = req.body;
    const messages = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']],
    });

    const report = await aiService.generateReport(messages, reportType || 'financiero');
    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reporte.' });
  }
};
