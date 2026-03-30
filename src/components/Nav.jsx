import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import './Nav.css';

const ROL_RUTAS = {
  admin:   ['/panel', '/turnos', '/servicios', '/pagos'],
  barbero: ['/panel', '/turnos', '/servicios', '/pagos'],
  cliente: ['/panel', '/cliente'],
};

const RUTA_LABEL = {
  '/panel':     'Inicio',
  '/turnos':    'Turnos',
  '/servicios': 'Servicios',
  '/pagos':     'Pagos',
  '/cliente':   'Mi Panel',
};

const ROL_COLOR = { admin: 'danger', barbero: 'warning', cliente: 'info' };

function AppNav({ user, onLogout }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const rutas = ROL_RUTAS[user?.rol] || [];

  return (
    <Navbar bg="dark" variant="dark" expand="md" className="app-nav">
      <Container>
        <Navbar.Brand className="nav-brand">✂️ Barbería</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto">
            {rutas.map((ruta) => (
              <Nav.Link
                key={ruta}
                active={pathname === ruta}
                onClick={() => navigate(ruta)}
              >
                {RUTA_LABEL[ruta]}
              </Nav.Link>
            ))}
          </Nav>
          <div className="nav-user">
            <Badge bg={ROL_COLOR[user?.rol] || 'secondary'} className="me-2">
              {user?.rol}
            </Badge>
            <span className="nav-usuario me-3">{user?.usuario}</span>
            <Button size="sm" variant="outline-light" onClick={onLogout}>Salir</Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNav;