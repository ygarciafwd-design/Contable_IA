import React, { useState, useRef, useMemo } from 'react';
import './DocsView.css';

const DocsView = ({ 
  documents, 
  facturas = [],
  onUploadDoc, 
  onDeleteDoc 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatCurrency = (amount, currency = 'CRC') => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '—';
    return num.toLocaleString('es-CR', { style: 'currency', currency, minimumFractionDigits: 2 });
  };

  const canalLabel = (canal) => {
    switch (canal) {
      case 'gmail':         return { icon: '📧', text: 'Gmail' };
      case 'drive':         return { icon: '☁️', text: 'Drive' };
      case 'upload_manual': return { icon: '📤', text: 'Manual' };
      default:              return { icon: '📎', text: 'Otro' };
    }
  };

  // Unify documents and facturas into a single sorted list
  const unifiedFiles = useMemo(() => {
    const docs = documents.map(d => ({ ...d, _type: 'document' }));
    const facts = facturas.map(f => ({ ...f, _type: 'factura' }));
    return [...docs, ...facts].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [documents, facturas]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadDoc(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUploadDoc(e.target.files[0]);
      e.target.value = '';
    }
  };

  // ── Render helpers ────────────────────────────────────────
  const renderDocumentCard = (doc) => {
    const mime = doc.mimeType === 'application/pdf' ? '📄' : '📝';
    return (
      <div key={`doc-${doc.id}`} className="doc-card">
        <span className="doc-icon">{mime}</span>
        <div className="doc-info">
          <div className="doc-name">{doc.originalName}</div>
          <div className="doc-meta">
            {formatBytes(doc.size)} · {new Date(doc.createdAt).toLocaleDateString('es')}
          </div>
          <div className={`doc-status ${doc.isProcessed ? 'done' : 'processing'}`}>
            {doc.isProcessed ? '✅ Procesado y disponible para IA' : '⏳ Procesando...'}
          </div>
        </div>
        <button className="action-btn danger" onClick={() => onDeleteDoc(doc.id)}>
          🗑️
        </button>
      </div>
    );
  };

  const renderFacturaCard = (f) => {
    const canal = canalLabel(f.canal);
    const isError = f.estado === 'ERROR';
    return (
      <div key={`fac-${f.id}`} className={`doc-card factura-card ${isError ? 'factura-error' : ''}`}>
        <span className="doc-icon">🧾</span>
        <div className="doc-info">
          <div className="doc-name">
            {f.filename}
            <span className={`canal-badge canal-${f.canal}`}>
              {canal.icon} {canal.text}
            </span>
          </div>
          <div className="doc-meta factura-meta">
            {f.proveedor && <span className="factura-proveedor">{f.proveedor}</span>}
            {f.total != null && <span className="factura-total">{formatCurrency(f.total, f.moneda)}</span>}
            {f.numeroFactura && <span className="factura-numero">Nº {f.numeroFactura}</span>}
          </div>
          <div className="doc-meta">
            {new Date(f.createdAt).toLocaleDateString('es')}
            {f.fechaEmision && ` · Emitida: ${f.fechaEmision}`}
          </div>
          <div className={`doc-status ${isError ? 'processing' : 'done'}`}>
            {isError ? '❌ Error en procesamiento' : '✅ Factura procesada'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="docs-view" className="active">
      <div className="admin-header">
        <h1>📄 Documentos</h1>
        <p>Carga PDFs para que la IA los analice y use como contexto</p>
      </div>

      <div 
        className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
        id="upload-zone" 
        onClick={() => fileInputRef.current.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".pdf,.txt" 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
        <div className="uz-icon">☁️</div>
        <h3>Arrastra tu PDF aquí</h3>
        <p>o haz clic para seleccionar un archivo · Máximo 10MB</p>
      </div>

      <div id="docs-list">
        {unifiedFiles.length === 0 ? (
          <p style={{ color: 'var(--text3)', textAlign: 'center', padding: '20px' }}>
            No hay documentos cargados
          </p>
        ) : (
          unifiedFiles.map(item =>
            item._type === 'factura'
              ? renderFacturaCard(item)
              : renderDocumentCard(item)
          )
        )}
      </div>
    </div>
  );
};

export default DocsView;
