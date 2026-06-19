import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import InicioSecion from './components/InicioSecion';
import InicioPanel from './components/InicioPanel';
import TurnosPage from './components/TurnosPage';
import PagosPage from './components/PagosPage';
import ServiciosPage from './components/ServiciosPage';
import PanelCliente from './components/PanelCliente';
import AppNav from './components/Nav';
import { apiRequest } from './services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('user')) || null; }
    catch { return null; }
  });

  const [turnos, setTurnos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [tiposPago, setTiposPago] = useState([]);
  const [descuentos, setDescuentos] = useState([]);

  const cargarDatos = useCallback(async () => {
    if (!user) return;
    try {
      const [t, p, s, tp, d] = await Promise.all([
        apiRequest('/api/turnos', {}, user),
        apiRequest('/api/pagos', {}, user),
        apiRequest('/api/servicios', {}, user),
        apiRequest('/api/tipos-pago', {}, user),
        apiRequest('/api/descuentos', {}, user),
      ]);
      setTurnos(Array.isArray(t) ? t : []);
      setPagos(Array.isArray(p) ? p : []);
      setServicios(Array.isArray(s) ? s : []);
      setTiposPago(Array.isArray(tp) ? tp : []);
      setDescuentos(Array.isArray(d) ? d : []);
    } catch { /* silencioso */ }
  }, [user]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleLogin = (userData) => {
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
    setTurnos([]); setPagos([]); setServicios([]); setTiposPago([]); setDescuentos([]);
  };

  const puedeVer = (modulo) => {
    if (!user) return false;
    const { rol } = user;
    if (rol === 'admin') return true;
    if (rol === 'barbero') return ['panel', 'turnos', 'servicios', 'pagos'].includes(modulo);
    if (rol === 'cliente') return ['panel', 'cliente'].includes(modulo);
    return false;
  };

  return (
    <BrowserRouter>
      {user && <AppNav user={user} onLogout={handleLogout} />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/panel" /> : <InicioSecion onLogin={handleLogin} />} />
        <Route path="/panel" element={user && puedeVer('panel') ? <InicioPanel user={user} /> : <Navigate to="/" />} />
        <Route path="/turnos" element={user && puedeVer('turnos')
          ? <TurnosPage turnos={turnos} onTurnoCreado={cargarDatos} user={user} />
          : <Navigate to="/" />}
        />
        <Route path="/pagos" element={user && puedeVer('pagos') ? <PagosPage pagos={pagos} /> : <Navigate to="/" />} />
        <Route path="/servicios" element={user && puedeVer('servicios')
          ? <ServiciosPage servicios={servicios} descuentos={descuentos} user={user} onServicioCreado={cargarDatos} />
          : <Navigate to="/" />}
        />
        <Route path="/cliente" element={user && puedeVer('cliente')
          ? <PanelCliente turnos={turnos} tiposPago={tiposPago} servicios={servicios} descuentos={descuentos} user={user} onDatosActualizados={cargarDatos} />
          : <Navigate to="/" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;