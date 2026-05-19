/**
 * scripts/seedMockData.js
 * Inserta datos de prueba en la base de datos mysql para realizar consultas
 * con el chatbot de IA.
 *
 * Ejecutar con:
 *   node scripts/seedMockData.js
 */

'use strict';

require('dotenv').config();
const { sequelize, User, Factura } = require('../models');
const bcrypt = require('bcryptjs');

const mockUsers = [
  {
    name: 'Juan Pérez',
    email: 'juan@contable.ia',
    password: 'User123!',
    role: 'usuario',
    isActive: true,
  },
  {
    name: 'María Gómez',
    email: 'maria@contable.ia',
    password: 'Contador123!',
    role: 'contador',
    isActive: true,
  }
];

const mockFacturas = [
  {
    canal: 'gmail',
    filename: 'factura_masxmenos_limpieza.pdf',
    mimeType: 'application/pdf',
    hashMd5: '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p',
    proveedor: 'Supermercado Mas x Menos',
    rucProveedor: '3-101-123456',
    cliente: 'ContableIA S.A.',
    rucCliente: '3-101-999999',
    numeroFactura: 'FAC-2026-001',
    fechaEmision: '2026-05-10',
    fechaVencimiento: '2026-06-10',
    moneda: 'CRC',
    subtotal: 45000.00,
    impuestos: 5850.00,
    descuentos: 0.00,
    total: 50850.00,
    tipoDocumento: 'factura',
    descripcion: 'Compra de suministros de limpieza y papelería para oficina central.',
    estado: 'PROCESSED',
  },
  {
    canal: 'drive',
    filename: 'recibo_ice_abril2026.pdf',
    mimeType: 'application/pdf',
    hashMd5: '2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p1a',
    proveedor: 'ICE (Instituto Costarricense de Electricidad)',
    rucProveedor: '3-008-044211',
    cliente: 'ContableIA S.A.',
    rucCliente: '3-101-999999',
    numeroFactura: 'ELEC-998877',
    fechaEmision: '2026-05-12',
    fechaVencimiento: '2026-05-30',
    moneda: 'CRC',
    subtotal: 120000.00,
    impuestos: 15600.00,
    descuentos: 0.00,
    total: 135600.00,
    tipoDocumento: 'factura',
    descripcion: 'Servicio de energía eléctrica comercial de las oficinas centrales del mes de abril 2026.',
    estado: 'PROCESSED',
  },
  {
    canal: 'upload_manual',
    filename: 'invoice_aws_hosting.pdf',
    mimeType: 'application/pdf',
    hashMd5: '3c4d5e6f7g8h9i0j1k2l3m4n5o6p1a2b',
    proveedor: 'AWS Cloud Services',
    rucProveedor: 'US-987654321',
    cliente: 'ContableIA S.A.',
    rucCliente: '3-101-999999',
    numeroFactura: 'INV-AWS-2026-44',
    fechaEmision: '2026-05-01',
    fechaVencimiento: '2026-05-15',
    moneda: 'USD',
    subtotal: 350.00,
    impuestos: 45.50,
    descuentos: 10.00,
    total: 385.50,
    tipoDocumento: 'factura',
    descripcion: 'Servicio mensual de hosting para servidores de base de datos MySQL y almacenamiento en la nube S3.',
    estado: 'PROCESSED',
  },
  {
    canal: 'gmail',
    filename: 'factura_suministros_sillas.pdf',
    mimeType: 'application/pdf',
    hashMd5: '4d5e6f7g8h9i0j1k2l3m4n5o6p1a2b3c',
    proveedor: 'Oficina de Suministros S.A.',
    rucProveedor: '3-101-998877',
    cliente: 'ContableIA S.A.',
    rucCliente: '3-101-999999',
    numeroFactura: 'FAC-9921',
    fechaEmision: '2026-04-20',
    fechaVencimiento: '2026-05-20',
    moneda: 'CRC',
    subtotal: 80000.00,
    impuestos: 10400.00,
    descuentos: 5000.00,
    total: 85400.00,
    tipoDocumento: 'factura',
    descripcion: 'Compra e instalación de dos sillas de oficina ergonómicas giratorias y reclinables.',
    estado: 'PROCESSED',
  }
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida con MySQL.');
    await sequelize.sync();
    console.log('✅ Tablas sincronizadas.');

    // 1. Insertar usuarios
    for (const u of mockUsers) {
      const exists = await User.findOne({ where: { email: u.email } });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(u.password, 12);
        await User.create({
          ...u,
          password: hashedPassword,
        });
        console.log(`👤 Usuario de prueba creado: ${u.name} (${u.role})`);
      } else {
        if (!exists.roleId) {
          await exists.save();
          console.log(`👤 RoleId de prueba actualizado para: ${exists.name}`);
        } else {
          console.log(`ℹ️ Usuario ya existe: ${u.email}`);
        }
      }
    }

    // 2. Insertar facturas
    for (const f of mockFacturas) {
      const exists = await Factura.findOne({ where: { hashMd5: f.hashMd5 } });
      if (!exists) {
        await Factura.create(f);
        console.log(`🧾 Factura insertada: ${f.numeroFactura} de ${f.proveedor} (${f.moneda} ${f.total})`);
      } else {
        console.log(`ℹ️ Factura ya existe en base de datos: ${f.numeroFactura}`);
      }
    }

    console.log('🚀 ¡Datos de prueba insertados con éxito!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error insertando datos de prueba:', err);
    process.exit(1);
  }
}

seed();
