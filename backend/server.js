require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const { sequelize } = require("./models");
const logger = require("./services/loggerService");
const { startScheduler } = require("./jobs/facturaProcessor");

// Asegurar que el directorio de logs exista
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const app = express();

// ── MIDDLEWARE ────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: "Demasiadas solicitudes. Intenta en unos minutos." },
});
app.use("/api/", limiter);

// ── ROUTES ────────────────────────────────────────────
app.use("/api", require("./routes"));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "ContableIA API",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

// Error handler global
app.use((err, req, res, next) => {
  logger.error(`[GlobalErrorHandler] ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: "Error interno del servidor." });
});

// ── START ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await sequelize.authenticate();
    logger.info("✅ Base de datos conectada.");

    // Sync: crea la tabla facturas si no existe
    await sequelize.sync();

    app.listen(PORT, () => {
      logger.info(`🚀 ContableIA API corriendo en http://localhost:${PORT}`);
      logger.info(`📋 Health check: http://localhost:${PORT}/health`);
    });

    // Arrancar procesador de facturas (Drive + Gmail)
    startScheduler();
  } catch (error) {
    logger.error("❌ Error al iniciar servidor:", { stack: error.stack });
    process.exit(1);
  }
}

start();
