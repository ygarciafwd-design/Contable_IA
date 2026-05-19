const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { Document } = require('../models');
const aiService = require('../services/aiService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

exports.upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF y TXT.'));
  },
}).single('document');

exports.uploadDocument = async (req, res) => {
  exports.upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido.' });

    try {
      const doc = await Document.create({
        uploadedBy: req.user.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        category: req.body.category || 'otro',
      });

      // Procesar en background
      processDocumentAsync(doc, req.file.path).catch(console.error);

      res.status(201).json({ document: doc, message: 'Documento cargado. Procesando...' });
    } catch (error) {
      res.status(500).json({ error: 'Error al guardar documento.' });
    }
  });
};

async function processDocumentAsync(doc, filePath) {
  try {
    let extractedText = '';

    if (doc.mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      extractedText = data.text;
    } else {
      extractedText = fs.readFileSync(filePath, 'utf-8');
    }

    const summary = await aiService.summarizeDocument(extractedText, doc.originalName);

    await doc.update({ extractedText: extractedText.substring(0, 50000), summary, isProcessed: true });
    console.log(`✅ Documento procesado: ${doc.originalName}`);
  } catch (error) {
    console.error('Error procesando documento:', error);
  }
}

exports.getDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { uploadedBy: req.user.id },
      attributes: { exclude: ['extractedText'] },
      order: [['createdAt', 'DESC']],
    });
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener documentos.' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ where: { id: req.params.id, uploadedBy: req.user.id } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' });

    const filePath = path.join(__dirname, '../uploads', doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await doc.destroy();
    res.json({ message: 'Documento eliminado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar documento.' });
  }
};
