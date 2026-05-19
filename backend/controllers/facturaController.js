/**
 * controllers/facturaController.js
 * Controlador — Facturas
 *
 * GET /api/facturas   — Lista paginada con filtros (canal, estado, proveedor, fechas)
 * GET /api/facturas/:id — Detalle de una factura
 */

'use strict';

const { Op }    = require('sequelize');
const Factura   = require('../models/Factura');
const logger    = require('../services/loggerService');

/**
 * GET /api/facturas
 * Query params:
 *   page      (default 1)
 *   limit     (default 20, max 100)
 *   canal     gmail | drive | upload_manual
 *   estado    PROCESSED | ERROR
 *   proveedor (búsqueda parcial)
 *   desde     YYYY-MM-DD  (fechaEmision >=)
 *   hasta     YYYY-MM-DD  (fechaEmision <=)
 */
async function getFacturas(req, res) {
  try {
    const page      = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit     = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset    = (page - 1) * limit;

    const where = {};

    if (req.query.canal)     where.canal     = req.query.canal;
    if (req.query.estado)    where.estado    = req.query.estado;
    if (req.query.proveedor) {
      where.proveedor = { [Op.like]: `%${req.query.proveedor}%` };
    }
    if (req.query.desde || req.query.hasta) {
      where.fechaEmision = {};
      if (req.query.desde) where.fechaEmision[Op.gte] = req.query.desde;
      if (req.query.hasta) where.fechaEmision[Op.lte] = req.query.hasta;
    }

    const { count, rows } = await Factura.findAndCountAll({
      where,
      order:      [['createdAt', 'DESC']],
      limit,
      offset,
      attributes: { exclude: ['rawOcr'] }, // excluir raw para la lista
    });

    return res.json({
      ok:   true,
      meta: {
        total:    count,
        page,
        limit,
        pages:    Math.ceil(count / limit),
      },
      data: rows,
    });

  } catch (err) {
    logger.error(`[FacturaController] GET /facturas error: ${err.message}`, { stack: err.stack });
    return res.status(500).json({ ok: false, error: 'Error al obtener facturas.' });
  }
}

/**
 * GET /api/facturas/:id
 * Retorna todos los campos incluido rawOcr.
 */
async function getFacturaById(req, res) {
  try {
    const factura = await Factura.findByPk(req.params.id);
    if (!factura) {
      return res.status(404).json({ ok: false, error: 'Factura no encontrada.' });
    }
    return res.json({ ok: true, data: factura });
  } catch (err) {
    logger.error(`[FacturaController] GET /facturas/:id error: ${err.message}`);
    return res.status(500).json({ ok: false, error: 'Error al obtener la factura.' });
  }
}

module.exports = { getFacturas, getFacturaById };
