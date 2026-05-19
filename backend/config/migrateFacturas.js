/**
 * config/migrateFacturas.js
 * Migración manual de la tabla `facturas`.
 * Ejecutar con: node config/migrateFacturas.js
 *
 * Útil si se prefiere control explícito en vez de sequelize.sync({ alter: true })
 */

'use strict';

require('dotenv').config();
const { sequelize } = require('../models');
const Factura       = require('../models/Factura');
const logger        = require('../services/loggerService');

async function migrate() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a BD establecida.');

    // force: false → no borra datos existentes
    // alter: true  → agrega columnas nuevas si faltan
    await Factura.sync({ alter: true });

    logger.info('✅ Tabla `facturas` sincronizada correctamente.');
    process.exit(0);
  } catch (err) {
    logger.error(`❌ Error en migración: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

migrate();
