import { useEffect, useState } from 'react';
import './App.css';
import InicioSecion from './components/InicioSecion';
import AppNavbar from './components/Nav';
import AppFooter from './components/AppFooter';
import InicioPanel from './components/InicioPanel';
import ServiciosPage from './components/ServiciosPage';
import TurnosPage from './components/TurnosPage';
import PagosPage from './components/PagosPage';
import { apiRequest } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('inicio');
  const [turnos, setTurnos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem('barberia_session_user');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setUser(parsed);
      } catch (error) {
        localStorage.removeItem('barberia_session_user');
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setTurnos([]);
      setServicios([]);
      setPagos([]);
      setActiveView('inicio');
    }
  }, [user]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [turnosRows, serviciosRows, pagosRows] = await Promise.all([
        apiRequest('/api/turnos'),
        apiRequest('/api/servicios'),
        apiRequest('/api/pagos'),
      ]);
      setTurnos(turnosRows);
      setServicios(serviciosRows);
      setPagos(pagosRows);
    } catch (error) {
      // Keep UI available even if one request fails.
      setTurnos([]);
      setServicios([]);
      setPagos([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogin = (loggedUser) => {
    setUser(loggedUser);
    localStorage.setItem('barberia_session_user', JSON.stringify(loggedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('barberia_session_user');
  };

  const handleNavigate = (view) => {
    setActiveView(view);
  };

  const renderMainContent = () => {
    if (!user) {
      return <InicioSecion onLogin={handleLogin} />;
    }

    if (isLoadingData) {
      return (
        <section className="auth-wrap">
          <article className="auth-card">
            <h1 className="auth-title">Cargando datos...</h1>
          </article>
        </section>
      );
    }

    switch (activeView) {
      case 'servicios':
        return <ServiciosPage servicios={servicios} />;
      case 'turnos':
        return <TurnosPage turnos={turnos} onTurnoCreated={loadData} />;
      case 'pagos':
        return <PagosPage pagos={pagos} />;
      case 'inicio':
      default:
        return <InicioPanel onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="App">
      <AppNavbar
        user={user}
        onLogout={handleLogout}
        activeView={activeView}
        onNavigate={handleNavigate}
      />

      <main className="app-main">{renderMainContent()}</main>

      <AppFooter />
    </div>
  );
}

export default App;
