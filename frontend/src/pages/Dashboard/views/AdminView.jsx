import React, { useState, useEffect } from 'react';
import './AdminView.css';

const AdminView = ({ 
  adminData, 
  onToggleUser, 
  onCreateUser 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('usuario');

  const { stats, users, auditLogs } = adminData;

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword) return;
    
    onCreateUser({
      name: newName.trim(),
      email: newEmail.trim(),
      password: newPassword,
      role: newRole
    });

    // Reset fields
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('usuario');
    setShowModal(false);
  };

  return (
    <div id="admin-view" className="active">
      <div className="admin-header">
        <h1>⚙️ Panel Administrativo</h1>
        <p>Gestión de usuarios, estadísticas y auditoría del sistema</p>
      </div>

      <div className="stats-grid" id="stats-grid">
        <div className="stat-card accent">
          <div className="stat-icon">👥</div>
          <div className="stat-value" id="stat-users">{stats.totalUsers !== null ? stats.totalUsers : '—'}</div>
          <div className="stat-label">Usuarios Totales</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value" id="stat-active">{stats.activeUsers !== null ? stats.activeUsers : '—'}</div>
          <div className="stat-label">Usuarios Activos</div>
        </div>
        <div className="stat-card gold">
          <div className="stat-icon">💬</div>
          <div className="stat-value" id="stat-convs">{stats.totalConversations !== null ? stats.totalConversations : '—'}</div>
          <div className="stat-label">Conversaciones</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📨</div>
          <div className="stat-value" id="stat-msgs">{stats.totalMessages !== null ? stats.totalMessages : '—'}</div>
          <div className="stat-label">Mensajes Totales</div>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-card-header">
          <h3>👥 Gestión de Usuarios</h3>
          <button className="btn-small" onClick={() => setShowModal(true)}>+ Nuevo Usuario</button>
        </div>
        
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último Login</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="users-table-body">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>
                    Cargando...
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td style={{ color: 'var(--text2)' }}>{u.email}</td>
                    <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                    <td>
                      <span className={`badge ${u.isActive ? 'active' : 'inactive'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text3)' }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('es') : 'Nunca'}
                    </td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="action-btn" 
                        onClick={() => onToggleUser(u.id, !u.isActive)}
                      >
                        {u.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-card-header">
          <h3>📋 Registro de Auditoría</h3>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Acción</th>
                <th>Usuario</th>
                <th>Estado</th>
                <th>IP</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody id="audit-table-body">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>
                    Cargando...
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 20).map(log => {
                  const statusColor = log.status === 'success' ? 'var(--green)' : log.status === 'failed' ? 'var(--red)' : 'var(--orange)';
                  return (
                    <tr key={log.id}>
                      <td>
                        <code style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                          {log.action}
                        </code>
                      </td>
                      <td style={{ color: 'var(--text2)' }}>
                        {log.user ? log.user.name : '—'}
                      </td>
                      <td>
                        <span style={{ color: statusColor }}>{log.status}</span>
                      </td>
                      <td style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                        {log.ipAddress || '—'}
                      </td>
                      <td style={{ color: 'var(--text3)' }}>
                        {new Date(log.createdAt).toLocaleString('es')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>➕ Crear Nuevo Usuario</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input 
                  type="text" 
                  placeholder="Juan Pérez" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  placeholder="juan@empresa.com" 
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input 
                  type="password" 
                  placeholder="Mínimo 8 caracteres" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select 
                  value={newRole} 
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ 
                    width: '100%', 
                    background: 'var(--bg3)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    padding: '12px 16px', 
                    color: 'var(--text)', 
                    fontSize: '14px', 
                    outline: 'none', 
                    fontFamily: 'var(--font-sans)' 
                  }}
                >
                  <option value="usuario">Usuario</option>
                  <option value="contador">Contador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-small">
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
