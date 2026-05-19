import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const API_URL = 'http://localhost:3001/api';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('contable_token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const apiFetch = async (path, method = 'GET', body = null, auth = true) => {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    // We want to pass the updated token from state if available, or fetch it directly
    const currentToken = localStorage.getItem('contable_token');
    if (auth && currentToken) {
      opts.headers['Authorization'] = `Bearer ${currentToken}`;
    }
    if (body) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(API_URL + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
    return data;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('contable_token');
      if (storedToken) {
        try {
          const opts = {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${storedToken}`
            },
          };
          const res = await fetch(API_URL + '/auth/me', opts);
          const data = await res.json();
          if (res.ok) {
            setCurrentUser(data.user);
            setToken(storedToken);
          } else {
            throw new Error(data.error || 'Invalid session');
          }
        } catch (err) {
          console.error("Auth check failed:", err);
          setToken(null);
          setCurrentUser(null);
          localStorage.removeItem('contable_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await apiFetch('/auth/login', 'POST', { email, password }, false);
      localStorage.setItem('contable_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      showToast('Sesión iniciada correctamente', 'success');
      return data;
    } catch (err) {
      showToast(err.message || 'Credenciales incorrectas.', 'error');
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('contable_token');
    showToast('Sesión cerrada', 'success');
  };

  return (
    <AuthContext.Provider value={{ token, currentUser, loading, login, logout, apiFetch, showToast, toast }}>
      {children}
      {toast.show && (
        <div id="toast" className={`show ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
