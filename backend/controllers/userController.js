const bcrypt = require('bcryptjs');
const { User, AuditLog, Conversation, Message } = require('../models');
const { Op } = require('sequelize');

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
    if (role) where.role = role;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    res.json({ users: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email ya registrado.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashedPassword, role });

    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      details: { name, email, role },
      ipAddress: req.ip,
    });

    res.status(201).json({ user: { id: user.id, name, email, role } });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario.' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, role, isActive, permissions } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    await user.update({ name, role, isActive, permissions });

    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: user.id,
      details: req.body,
      ipAddress: req.ip,
    });

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });

    await user.update({ isActive: false });
    res.json({ message: 'Usuario desactivado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalConversations, totalMessages] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      Conversation.count(),
      Message.count(),
    ]);

    const recentActivity = await AuditLog.findAll({
      include: [{ association: 'user', attributes: ['name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.json({ stats: { totalUsers, activeUsers, totalConversations, totalMessages }, recentActivity });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas.' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { count, rows } = await AuditLog.findAndCountAll({
      include: [{ association: 'user', attributes: ['name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ logs: rows, total: count });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener auditoría.' });
  }
};
