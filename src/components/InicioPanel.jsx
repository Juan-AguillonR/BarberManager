import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import './InicioPanel.css';

function InicioPanel({ onNavigate }) {
  return (
    <section className="home-wrap" id="inicio" aria-label="Inicio del cliente">
      <h1 className="home-title">Panel de Control</h1>

      <div className="home-grid">
        <Card className="home-card">
          <Card.Body>
            <Card.Title>Turnos</Card.Title>
            <Card.Text>Gestiona las reservas de clientes</Card.Text>
            <Button variant="dark" onClick={() => onNavigate('turnos')}>
              Ver Turnos
            </Button>
          </Card.Body>
        </Card>

        <Card className="home-card">
          <Card.Body>
            <Card.Title>Servicios</Card.Title>
            <Card.Text>Administra cortes y precios</Card.Text>
            <Button variant="dark" onClick={() => onNavigate('servicios')}>
              Ver Servicios
            </Button>
          </Card.Body>
        </Card>

        <Card className="home-card">
          <Card.Body>
            <Card.Title>Pagos</Card.Title>
            <Card.Text>Controla el flujo de caja</Card.Text>
            <Button variant="dark" onClick={() => onNavigate('pagos')}>
              Ver Pagos
            </Button>
          </Card.Body>
        </Card>
      </div>
    </section>
  );
}

export default InicioPanel;
