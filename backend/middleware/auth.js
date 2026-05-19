const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Inicia sesión nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}.`,
      });
    }
    next();
  };
};

const hasPermission = (permission) => {
  return (req, res, next) => {
    const userPerms = req.user.permissions || [];
    const rolePerms = getRolePermissions(req.user.role);
    if (rolePerms.includes(permission) || userPerms.includes(permission)) {
      return next();
    }
    return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
  };
};

function getRolePermissions(role) {
  const permissions = {
    admin: ['users:read', 'users:write', 'users:delete', 'reports:read', 'reports:write',
            'documents:read', 'documents:write', 'audit:read', 'db:query', 'chat:use'],
    contador: ['reports:read', 'reports:write', 'documents:read', 'documents:write', 'db:query', 'chat:use'],
    usuario: ['chat:use', 'documents:read'],
  };
  return permissions[role] || [];
}

module.exports = { authenticate, authorize, hasPermission };
