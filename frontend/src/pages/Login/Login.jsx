import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-screen">
      <div className="login-box">
        <div className="login-logo">
          <span className="icon">🧾</span>
          <h1>Contable<span>IA</span></h1>
          <p>Asistente Contable Inteligente</p>
        </div>

        {error && <div className="login-error" style={{ display: 'block' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input 
              type="email" 
              placeholder="admin@contable.ia" 
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--text3)' }}>
          ContableIA v1.0 — Powered by Claude AI
        </p>
      </div>
    </div>
  );
};

export default Login;
