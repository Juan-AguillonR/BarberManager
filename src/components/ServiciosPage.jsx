import { useState } from 'react';
import './ServiciosPage.css';
import Table from 'react-bootstrap/Table';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import { apiRequest } from '../services/api';

function ServiciosPage({ servicios, user, onServicioCreado }) {
  const [tipo, setTipo] = useState('');
  const [precio, setPrecio] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const esAdmin = user?.rol === 'admin';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (!tipo.trim() || precio === '') {
      setStatus({ type: 'danger', message: 'Debes indicar nombre y precio del servicio.' });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest('/api/servicios', {
        method: 'POST',
        body: JSON.stringify({ tipo: tipo.trim(), precio: Number(precio) }),
      }, user);
      setStatus({ type: 'success', message: 'Servicio registrado correctamente.' });
      setTipo('');
      setPrecio('');
      if (onServicioCreado) onServicioCreado();
    } catch (error) {
      setStatus({ type: 'danger', message: error.message || 'No se pudo registrar el servicio.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel-wrap" id="servicios" aria-label="Listado de servicios">
      <h1 className="panel-title">Servicios</h1>

      {esAdmin && (
        <article className="panel-block" data-testid="servicios-form-section">
          <h2>Registrar nuevo servicio</h2>
          {status.message && (
            <Alert variant={status.type} data-testid="servicios-alert">{status.message}</Alert>
          )}
          <Form onSubmit={handleSubmit} data-testid="servicios-form" className="turno-form-grid">
            <Form.Group>
              <Form.Label>Nombre del servicio</Form.Label>
              <Form.Control
                type="text"
                data-testid="servicio-nombre"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                placeholder="Ej: Corte clásico"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Precio</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                data-testid="servicio-precio"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Ej: 25000"
              />
            </Form.Group>
            <Button type="submit" variant="dark" disabled={isSaving} data-testid="servicio-submit">
              {isSaving ? 'Guardando...' : 'Guardar servicio'}
            </Button>
          </Form>
        </article>
      )}

      <article className="panel-block">
        <Table striped bordered hover responsive data-testid="servicios-tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Precio</th>
              <th>Turno ID</th>
            </tr>
          </thead>
          <tbody>
            {servicios.length === 0 ? (
              <tr>
                <td colSpan={4}>No hay servicios registrados.</td>
              </tr>
            ) : (
              servicios.map((servicio) => (
                <tr key={servicio.id} data-testid={`servicio-fila-${servicio.id}`}>
                  <td>{servicio.id}</td>
                  <td>{servicio.tipo || '-'}</td>
                  <td>{servicio.precio ?? '-'}</td>
                  <td>{servicio.turnoId ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </article>
    </section>
  );
}

export default ServiciosPage;
