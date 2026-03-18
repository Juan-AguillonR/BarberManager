import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import './Nav.css';

function AppNavbar({ user, onLogout, activeView, onNavigate }) {
  return (
    <Navbar bg="dark" data-bs-theme="dark" expand="lg" className="app-navbar shadow-sm">
      <Container fluid>
        <Navbar.Brand href="#inicio" onClick={() => onNavigate('inicio')}>
          💈 BarberManager
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar-nav" />
        <Navbar.Collapse id="main-navbar-nav">
          <Nav className="me-auto ms-lg-3" activeKey={activeView}>
            <Nav.Link eventKey="inicio" href="#inicio" onClick={() => onNavigate('inicio')}>
              Inicio
            </Nav.Link>
            <Nav.Link eventKey="servicios" href="#servicios" onClick={() => onNavigate('servicios')}>
              Servicios
            </Nav.Link>
            <Nav.Link eventKey="turnos" href="#turnos" onClick={() => onNavigate('turnos')}>
              Turnos
            </Nav.Link>
          </Nav>

          {user ? (
            <div className="navbar-user-actions">
              <span className="navbar-user-label">{user.usuario} (cliente)</span>
              <Button variant="outline-light" size="sm" onClick={onLogout}>
                Cerrar sesion
              </Button>
            </div>
          ) : null}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;