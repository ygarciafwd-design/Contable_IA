import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { useAuth } from '../../../context/AuthContext';
import './ChatView.css';

const ChatView = ({ 
  messages, 
  onSendMessage, 
  isLoading, 
  processedDocsCount, 
  onUploadFile 
}) => {
  const { currentUser } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [activeSpeech, setActiveSpeech] = useState(null); // stores the index of speaking message
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    // Re-highlight code blocks when messages change
    if (containerRef.current) {
      containerRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInputValue(e.target.value);
    // Auto resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const speakText = (text, index) => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (activeSpeech === index) {
        setActiveSpeech(null);
        return;
      }
    }

    const plainText = text.replace(/[#*`_~\[\]]/g, '').substring(0, 500);
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    
    setActiveSpeech(index);
    utterance.onend = () => {
      setActiveSpeech(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  const renderMessageContent = (msg) => {
    if (msg.role === 'assistant' || msg.role === 'ai') {
      const html = marked.parse(msg.content);
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return <div>{msg.content}</div>;
  };

  return (
    <div id="chat-view">
      <div className="messages-container" id="messages-container" ref={containerRef}>
        {messages.length === 0 ? (
          <div className="welcome-screen" id="welcome-screen">
            <div className="welcome-icon">🤖</div>
            <h2>Hola, soy <span>ContableIA</span></h2>
            <p>Tu asistente contable inteligente. Puedo responder preguntas financieras, consultar tu base de datos, analizar documentos PDF y generar reportes.</p>
            
            <div className="suggestions-grid">
              <div className="suggestion-card" onClick={() => onSendMessage('¿Cuántos usuarios hay registrados en el sistema?')}>
                <span className="sug-icon">🗄️</span>
                <div className="sug-title">Consulta BD</div>
                <div className="sug-desc">¿Cuántos usuarios hay en el sistema?</div>
              </div>
              <div className="suggestion-card" onClick={() => onSendMessage('Explícame cómo calcular el IVA en Costa Rica')}>
                <span className="sug-icon">📋</span>
                <div className="sug-title">Impuestos</div>
                <div className="sug-desc">¿Cómo calcular el IVA correctamente?</div>
              </div>
              <div className="suggestion-card" onClick={() => onSendMessage('Genera un análisis del estado financiero de la empresa')}>
                <span className="sug-icon">📈</span>
                <div className="sug-title">Análisis</div>
                <div className="sug-desc">Análisis del estado financiero</div>
              </div>
              <div className="suggestion-card" onClick={() => onSendMessage('¿Cuáles son las diferencias entre NIIF y US GAAP?')}>
                <span className="sug-icon">📚</span>
                <div className="sug-title">NIIF / GAAP</div>
                <div className="sug-desc">Normas contables internacionales</div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const role = msg.role === 'assistant' || msg.role === 'ai' ? 'ai' : 'user';
            const metadata = msg.metadata || {};
            
            return (
              <div key={index} className={`message-wrap ${role}`}>
                <div className={`msg-avatar ${role === 'user' ? 'user-av' : 'ai'}`}>
                  {role === 'user' ? getInitials(currentUser?.name) : '🤖'}
                </div>
                
                <div className="msg-bubble">
                  {metadata.sqlExecuted && (
                    <div className="sql-badge">
                      🗄️ SQL: <code>
                        {metadata.sqlExecuted.substring(0, 80)}
                        {metadata.sqlExecuted.length > 80 ? '...' : ''}
                      </code>
                    </div>
                  )}
                  
                  {renderMessageContent(msg)}
                  
                  <div className="msg-meta">
                    <span className="msg-time">
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {role === 'ai' && (
                      <>
                        <button 
                          className="btn-tts" 
                          title="Escuchar respuesta"
                          onClick={() => speakText(msg.content, index)}
                        >
                          {activeSpeech === index ? '⏹️' : '🔊'}
                        </button>
                        {metadata.processingTime && (
                          <span className="msg-time">
                            {(metadata.processingTime / 1000).toFixed(1)}s
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div id="typing-indicator" className="message-wrap ai">
            <div className="msg-avatar ai">🤖</div>
            <div className="msg-bubble">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="input-area">
        <div className="features-pills">
          <span className="feat-pill active">🤖 IA Activa</span>
          <span className="feat-pill active" id="db-pill">🗄️ BD Conectada</span>
          <span className={`feat-pill ${processedDocsCount > 0 ? 'active' : ''}`} id="doc-pill">
            📄 {processedDocsCount > 0 ? `${processedDocsCount} doc${processedDocsCount > 1 ? 's' : ''}` : 'Sin documentos'}
          </span>
          <span className="feat-pill active">🔊 TTS</span>
        </div>
        
        <div className="input-wrapper">
          <textarea 
            ref={textareaRef}
            id="message-input" 
            placeholder="Pregunta sobre contabilidad, finanzas, o pide datos de tu base de datos..." 
            rows="1" 
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          
          <div className="input-actions">
            <button 
              className="btn-attach" 
              title="Adjuntar PDF"
              onClick={() => fileInputRef.current.click()}
              disabled={isLoading}
            >
              📎
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".pdf,.txt" 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            <button 
              className="btn-send" 
              id="send-btn" 
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
            >
              ➤
            </button>
          </div>
        </div>
        <div className="input-hint">Enter para enviar · Shift+Enter para nueva línea</div>
      </div>
    </div>
  );
};

export default ChatView;
