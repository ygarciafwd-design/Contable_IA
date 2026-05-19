const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { len: [2, 100] },
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'contador', 'usuario'),
    defaultValue: 'usuario',
    allowNull: false,
  },
  roleId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Permisos adicionales específicos del usuario',
  },
}, {
  tableName: 'users',
  indexes: [{ unique: true, fields: ['email'] }],
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('role') || !user.roleId) {
        const Role = sequelize.models.Role;
        if (Role) {
          const roleRecord = await Role.findOne({ where: { name: user.role } });
          if (roleRecord) {
            user.roleId = roleRecord.id;
          }
        }
      }
    }
  }
});

module.exports = User;
