import React, { useState, useRef } from 'react';
import './DocsView.css';

const DocsView = ({ 
  documents, 
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
        {documents.length === 0 ? (
          <p style={{ color: 'var(--text3)', textAlign: 'center', padding: '20px' }}>
            No hay documentos cargados
          </p>
        ) : (
          documents.map(doc => {
            const mime = doc.mimeType === 'application/pdf' ? '📄' : '📝';
            return (
              <div key={doc.id} className="doc-card">
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
          })
        )}
      </div>
    </div>
  );
};

export default DocsView;
