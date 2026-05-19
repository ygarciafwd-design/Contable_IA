import React from 'react';
import './PanelUsuario.css';

const PanelUsuario = () => {
  return (
    <div className="panel-usuario">
      <div className="panel-usuario-header">
        <div className="usuario-avatar">JD</div>
        <div className="usuario-info">
          <h3>Juan Diego Perez</h3>
          <p>Administrador de Empresa</p>
        </div>
      </div>
      <div className="panel-usuario-body">
        <div className="stat-card">
          <h4>Facturas Emitidas</h4>
          <span className="stat-value">124</span>
        </div>
        <div className="stat-card">
          <h4>Ingresos del Mes</h4>
          <span className="stat-value">$14,500.00</span>
        </div>
        <div className="stat-card">
          <h4>Alertas del Sistema</h4>
          <span className="stat-value warning">2</span>
        </div>
      </div>
    </div>
  );
};

export default PanelUsuario;
