import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Layout/Sidebar';
import ChatView from './views/ChatView';
import DocsView from './views/DocsView';
import AdminView from './views/AdminView';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, logout, apiFetch, showToast } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // App States
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Admin View States
  const [adminData, setAdminData] = useState({
    stats: { totalUsers: null, activeUsers: null, totalConversations: null, totalMessages: null },
    users: [],
    auditLogs: []
  });

  // Load baseline data on startup
  useEffect(() => {
    loadConversations();
    loadDocuments();
  }, []);

  // Poll processed docs and conversations list
  useEffect(() => {
    const timer = setInterval(() => {
      // Reload documents to check processed status
      if (location.pathname === '/dashboard/docs') {
        loadDocuments();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [location.pathname]);

  // Load admin data when visiting admin route
  useEffect(() => {
    if (location.pathname === '/dashboard/admin' && currentUser?.role === 'admin') {
      loadAdminData();
    }
  }, [location.pathname, currentUser]);

  // ── API HANDLERS ──────────────────────────────────
  const loadConversations = async () => {
    try {
      const data = await apiFetch('/chat/conversations');
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await apiFetch('/documents');
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const loadAdminData = async () => {
    try {
      const [statsData, usersData, auditData] = await Promise.all([
        apiFetch('/admin/stats'),
        apiFetch('/admin/users'),
        apiFetch('/admin/audit'),
      ]);
      setAdminData({
        stats: statsData.stats,
        users: usersData.users || [],
        auditLogs: auditData.logs || []
      });
    } catch (err) {
      console.error('Error loading admin data:', err);
      showToast('Error al cargar datos del panel', 'error');
    }
  };

  const handleSendMessage = async (text) => {
    if (isLoading) return;
    
    // Add user message optimistically
    const userMsg = { role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const data = await apiFetch('/chat/message', 'POST', {
        message: text,
        conversationId: currentConversationId,
      });

      // Update active conversation ID and append AI message
      setCurrentConversationId(data.conversationId);
      const aiMsg = { 
        role: 'assistant', 
        content: data.message.content, 
        metadata: data.message.metadata,
        createdAt: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMsg]);
      loadConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: '❌ Error al procesar tu mensaje. Verifica la conexión con el servidor.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    navigate('/dashboard');
  };

  const handleSelectConversation = async (id) => {
    try {
      const data = await apiFetch(`/chat/conversations/${id}`);
      setCurrentConversationId(id);
      
      const convMessages = (data.conversation.messages || [])
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'ai' : m.role,
          content: m.content,
          metadata: m.metadata || {},
          createdAt: m.createdAt
        }));
      
      setMessages(convMessages);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error loading conversation:', err);
      showToast('Error al cargar conversación', 'error');
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await apiFetch(`/chat/conversations/${id}`, 'DELETE');
      if (currentConversationId === id) {
        handleNewConversation();
      }
      setConversations(prev => prev.filter(c => c.id !== id));
      showToast('Conversación eliminada', 'success');
    } catch (err) {
      console.error('Error deleting conversation:', err);
      showToast('Error al eliminar conversación', 'error');
    }
  };

  const handleGenerateReport = async () => {
    if (!currentConversationId) {
      showToast('Inicia una conversación primero', 'error');
      return;
    }
    showToast('Generando reporte...', 'success');
    try {
      const data = await apiFetch('/chat/report', 'POST', {
        conversationId: currentConversationId,
        reportType: 'financiero',
      });
      setMessages(prev => [
        ...prev,
        { 
          role: 'ai', 
          content: '📊 **Reporte Generado:**\n\n' + data.report,
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error('Error generating report:', err);
      showToast('Error al generar reporte', 'error');
    }
  };

  const handleUploadDoc = async (file) => {
    showToast('Subiendo documento...', 'success');
    const formData = new FormData();
    formData.append('document', file);

    const token = localStorage.getItem('contable_token');
    try {
      const res = await fetch('http://localhost:3001/api/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast('Documento cargado. Procesando con IA...', 'success');
      setTimeout(() => loadDocuments(), 3000);
    } catch (err) {
      console.error('Error uploading document:', err);
      showToast(err.message || 'Error al subir documento', 'error');
    }
  };

  const handleDeleteDoc = async (id) => {
    try {
      await apiFetch(`/documents/${id}`, 'DELETE');
      setDocuments(prev => prev.filter(d => d.id !== id));
      showToast('Documento eliminado', 'success');
    } catch (err) {
      console.error('Error deleting document:', err);
      showToast('Error al eliminar', 'error');
    }
  };

  const handleToggleUserStatus = async (id, isActive) => {
    try {
      await apiFetch(`/admin/users/${id}`, 'PUT', { isActive });
      showToast('Usuario actualizado', 'success');
      loadAdminData();
    } catch (err) {
      console.error('Error toggling user status:', err);
      showToast('Error al actualizar usuario', 'error');
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      await apiFetch('/admin/users', 'POST', userData);
      showToast('Usuario creado exitosamente', 'success');
      loadAdminData();
    } catch (err) {
      console.error('Error creating user:', err);
      showToast(err.message || 'Error al crear usuario', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine topbar title dynamically based on location
  const getTitle = () => {
    if (location.pathname === '/dashboard/docs') return '📄 Documentos';
    if (location.pathname === '/dashboard/admin') return '⚙️ Panel Administrativo';
    return '💬 Asistente Contable';
  };

  const processedDocsCount = documents.filter(d => d.isProcessed).length;

  return (
    <div id="app">
      <Sidebar 
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <div id="main">
        <div className="topbar">
          <span style={{ fontSize: '18px' }}>
            {location.pathname === '/dashboard/docs' ? '📄' : location.pathname === '/dashboard/admin' ? '⚙️' : '💬'}
          </span>
          <span className="topbar-title">{getTitle()}</span>
          
          <div className="topbar-actions">
            <div className="status-dot" title="IA activa"></div>
            {location.pathname === '/dashboard' && (
              <button 
                className="btn-icon" 
                onClick={handleGenerateReport} 
                id="btn-report" 
                title="Generar reporte"
                disabled={!currentConversationId}
              >
                📊 Reporte
              </button>
            )}
            <button className="btn-icon" onClick={handleLogout}>🚪 Salir</button>
          </div>
        </div>

        <Routes>
          <Route 
            path="/" 
            element={
              <ChatView 
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                processedDocsCount={processedDocsCount}
                onUploadFile={handleUploadDoc}
              />
            } 
          />
          <Route 
            path="/docs" 
            element={
              <DocsView 
                documents={documents}
                onUploadDoc={handleUploadDoc}
                onDeleteDoc={handleDeleteDoc}
              />
            } 
          />
          <Route 
            path="/admin" 
            element={
              currentUser?.role === 'admin' ? (
                <AdminView 
                  adminData={adminData}
                  onToggleUser={handleToggleUserStatus}
                  onCreateUser={handleCreateUser}
                />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
