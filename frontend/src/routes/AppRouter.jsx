import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login/Login';
import Dashboard from '../pages/Dashboard/Dashboard';

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        background: '#0a0f1c', 
        color: '#e2e8f0', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justify: 'center', 
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif" 
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>🧾</span>
          <h3>Cargando ContableIA...</h3>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        background: '#0a0f1c', 
        color: '#e2e8f0', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif" 
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>🧾</span>
          <h3>Cargando ContableIA...</h3>
        </div>
      </div>
    );
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
