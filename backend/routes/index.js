const express = require('express');
const router = express.Router();
const authController     = require('../controllers/authController');
const chatController     = require('../controllers/chatController');
const userController     = require('../controllers/userController');
const documentController = require('../controllers/documentController');
const facturaController  = require('../controllers/facturaController');
const { authenticate, authorize } = require('../middleware/auth');

// ── AUTH ─────────────────────────────────────────────
router.post('/auth/login', authController.login);
router.post('/auth/register', authenticate, authorize('admin'), authController.register);
router.get('/auth/me', authenticate, authController.me);
router.post('/auth/refresh', authenticate, authController.refreshToken);

// ── CHAT ─────────────────────────────────────────────
router.post('/chat/message', authenticate, chatController.sendMessage);
router.get('/chat/conversations', authenticate, chatController.getConversations);
router.get('/chat/conversations/:id', authenticate, chatController.getConversation);
router.delete('/chat/conversations/:id', authenticate, chatController.deleteConversation);
router.post('/chat/report', authenticate, authorize('admin', 'contador'), chatController.generateReport);

// ── DOCUMENTS (RAG) ───────────────────────────────────
router.post('/documents', authenticate, documentController.uploadDocument);
router.get('/documents', authenticate, documentController.getDocuments);
router.delete('/documents/:id', authenticate, documentController.deleteDocument);

// ── USERS (Admin only) ────────────────────────────────
router.get('/admin/users', authenticate, authorize('admin'), userController.getUsers);
router.post('/admin/users', authenticate, authorize('admin'), userController.createUser);
router.put('/admin/users/:id', authenticate, authorize('admin'), userController.updateUser);
router.delete('/admin/users/:id', authenticate, authorize('admin'), userController.deleteUser);
router.get('/admin/stats', authenticate, authorize('admin'), userController.getStats);
router.get('/admin/audit', authenticate, authorize('admin'), userController.getAuditLogs);

// ── FACTURAS ──────────────────────────────────────────
// GET /api/facturas          — lista paginada con filtros
// GET /api/facturas/:id      — detalle de una factura
router.get('/facturas',     authenticate, facturaController.getFacturas);
router.get('/facturas/:id', authenticate, facturaController.getFacturaById);

module.exports = router;
