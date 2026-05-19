require('dotenv').config();
const sequelize = require('./database');
const { User, Role, Conversation, Message, Document, AuditLog } = require('../models');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida.');

    await sequelize.sync({ alter: true });
    console.log('✅ Tablas sincronizadas correctamente.');

    // Crear roles por defecto si no existen
    const defaultRoles = [
      { name: 'admin', displayName: 'Administrador', description: 'Acceso total al sistema y administración de usuarios' },
      { name: 'contador', displayName: 'Contador', description: 'Consulta de reportes, facturas y auditoría' },
      { name: 'usuario', displayName: 'Usuario estándar', description: 'Uso del chat básico y carga de documentos' }
    ];

    for (const r of defaultRoles) {
      const [roleRecord, created] = await Role.findOrCreate({
        where: { name: r.name },
        defaults: r
      });
      if (created) {
        console.log(`✅ Rol de prueba creado: ${r.displayName}`);
      }
    }

    // Crear usuario administrador por defecto si no existe
    const bcrypt = require('bcryptjs');
    const adminExists = await User.findOne({ where: { email: 'admin@contable.ia' } });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      await User.create({
        name: 'Administrador',
        email: 'admin@contable.ia',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Usuario admin creado: admin@contable.ia / Admin123!');
    } else {
      if (!adminExists.roleId) {
        await adminExists.save();
        console.log('✅ RoleId de administrador existente actualizado.');
      }
    }

    console.log('🚀 Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

migrate();
