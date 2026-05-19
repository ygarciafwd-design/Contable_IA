import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ 
  conversations, 
  currentConversationId, 
  onNewConversation, 
  onSelectConversation, 
  onDeleteConversation 
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleUserCardClick = () => {
    if (currentUser?.role === 'admin') {
      navigate('/dashboard/admin');
    }
  };

  const getAvatar = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div id="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">🧾</span>
          <h2>Contable<span>IA</span></h2>
        </div>
        <button className="btn-new-chat" onClick={onNewConversation}>
          ✏️ Nueva conversación
        </button>
      </div>

      <div className="sidebar-nav">
        <NavLink 
          to="/dashboard" 
          end 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">💬</span> Chat IA
        </NavLink>
        
        <NavLink 
          to="/dashboard/docs" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">📄</span> Documentos
        </NavLink>

        {currentUser?.role === 'admin' && (
          <NavLink 
            to="/dashboard/admin" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">⚙️</span> Panel Admin
          </NavLink>
        )}
      </div>

      <div className="conversations-list" id="conversations-list">
        <div className="conv-section-label">Conversaciones recientes</div>
        
        {conversations.length === 0 ? (
          <div style={{ padding: '12px', color: 'var(--text3)', fontSize: '12px', textAlign: 'center' }}>
            Sin conversaciones
          </div>
        ) : (
          conversations.map(conv => (
            <div 
              key={conv.id} 
              className={`conv-item ${conv.id === currentConversationId && location.pathname === '/dashboard' ? 'active' : ''}`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <span className="conv-title">{conv.title}</span>
              <span 
                className="conv-delete" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
              >
                ×
              </span>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-card" onClick={handleUserCardClick}>
          <div className="user-avatar" id="user-avatar-sidebar">
            {getAvatar(currentUser?.name)}
          </div>
          <div className="user-info">
            <div className="user-name" id="user-name-sidebar">
              {currentUser?.name || 'Cargando...'}
            </div>
            <div className="user-role" id="user-role-sidebar">
              {currentUser && (
                <span className={`role-badge ${currentUser.role}`}>
                  {currentUser.role}
                </span>
              )}
            </div>
          </div>
          <span style={{ color: 'var(--text3)', fontSize: '16px' }}>⋮</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
