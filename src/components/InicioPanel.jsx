import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Alert from 'react-bootstrap/Alert';
import { apiRequest } from '../services/api';
import './InicioPanel.css';

const MODULOS = {
  admin:   ['turnos', 'servicios', 'pagos'],
  barbero: ['turnos', 'servicios', 'pagos'],
  cliente: ['cliente'],
};

const MODULO_INFO = {
  turnos:   { titulo: 'Turnos',    descripcion: 'Gestiona las reservas de clientes', ruta: '/turnos',    icono: '📅' },
  servicios:{ titulo: 'Servicios', descripcion: 'Administra cortes y precios',       ruta: '/servicios', icono: '✂️' },
  pagos:    { titulo: 'Pagos',     descripcion: 'Controla el flujo de caja',         ruta: '/pagos',     icono: '💰' },
  cliente:  { titulo: 'Mi Panel',  descripcion: 'Consulta tus turnos y servicios',   ruta: '/cliente',   icono: '👤' },
};

const ROL_COLOR = { admin: 'danger', barbero: 'warning', cliente: 'info' };

function InicioPanel({ user }) {
  const navigate = useNavigate();
  const modulosVisibles = MODULOS[user?.rol] || [];
  const [backupStatus, setBackupStatus] = useState({ type: '', message: '' });
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupStatus({ type: '', message: '' });
    try {
      await apiRequest('/api/backup', { method: 'POST' }, user);
      setBackupStatus({ type: 'success', message: '✅ Backup creado correctamente en server/backups/' });
    } catch (error) {
      setBackupStatus({ type: 'danger', message: error.message || 'No se pudo crear el backup.' });
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <section className="home-wrap" id="inicio" aria-label="Panel de control">
      <div className="home-header">
        <h1 className="home-title">Panel de Control</h1>
        <Badge bg={ROL_COLOR[user?.rol] || 'secondary'} className="home-badge">
          {user?.rol?.toUpperCase()}
        </Badge>
      </div>
      <p className="home-saludo">Bienvenido, <strong>{user?.nombre || user?.usuario}</strong></p>

      <div className="home-grid">
        {modulosVisibles.map((modulo) => {
          const info = MODULO_INFO[modulo];
          return (
            <Card className="home-card" key={modulo}>
              <Card.Body>
                <div className="home-card-icon">{info.icono}</div>
                <Card.Title>{info.titulo}</Card.Title>
                <Card.Text>{info.descripcion}</Card.Text>
                <Button variant="dark" onClick={() => navigate(info.ruta)}>
                  Ver {info.titulo}
                </Button>
              </Card.Body>
            </Card>
          );
        })}

        {user?.rol === 'admin' && (
          <Card className="home-card home-card-admin">
            <Card.Body>
              <div className="home-card-icon">🗄️</div>
              <Card.Title>Base de Datos</Card.Title>
              <Card.Text>Crea una copia de seguridad ahora</Card.Text>
              <Button variant="outline-dark" onClick={handleBackup} disabled={isBackingUp}>
                {isBackingUp ? 'Creando backup...' : 'Hacer Backup'}
              </Button>
            </Card.Body>
          </Card>
        )}
      </div>

      {backupStatus.message && (
        <Alert variant={backupStatus.type} className="mt-3" onClose={() => setBackupStatus({ type: '', message: '' })} dismissible>
          {backupStatus.message}
        </Alert>
      )}
    </section>
  );
}

export default InicioPanel;