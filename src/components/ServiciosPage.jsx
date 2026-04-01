import { useState } from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import { apiRequest } from '../services/api';
import './ServiciosPage.css';

function ServiciosPage({ servicios = [], user, onServicioCreado }) {
  const [tipo, setTipo] = useState('');
  const [precio, setPrecio] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  const esAdmin = user?.rol === 'admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!tipo.trim() || !precio) {
      setStatus({ type: 'danger', message: 'Debes completar tipo y precio.' });
      return;
    }

    if (isNaN(precio) || Number(precio) <= 0) {
      setStatus({ type: 'danger', message: 'El precio debe ser un número mayor a 0.' });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest('/api/servicios', {
        method: 'POST',
        body: JSON.stringify({ tipo: tipo.trim(), precio: Number(precio) }),
      }, user);
      setStatus({ type: 'success', message: 'Servicio creado correctamente.' });
      setTipo(''); setPrecio('');
      if (onServicioCreado) onServicioCreado();
    } catch (error) {
      setStatus({ type: 'danger', message: error.message || 'No se pudo crear el servicio.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel-wrap" id="servicios" aria-label="Listado de servicios">
      <h1 className="panel-title">Servicios</h1>

      {/* ── Tabla de servicios ── */}
      <article className="panel-block">
        <Table striped bordered hover responsive>
          <thead>
            <tr><th>ID</th><th>Tipo</th><th>Precio</th><th>Turno ID</th></tr>
          </thead>
          <tbody>
            {servicios.length === 0 ? (
              <tr><td colSpan={4}>No hay servicios registrados.</td></tr>
            ) : (
              servicios.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.tipo || '-'}</td>
                  <td>${s.precio ?? '-'}</td>
                  <td>{s.turnoId ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </article>

      {/* ── Formulario solo para admin ── */}
      {esAdmin && (
        <article className="panel-block">
          <h2>Crear nuevo servicio</h2>
          {status.message && (
            <Alert variant={status.type} onClose={() => setStatus({ type: '', message: '' })} dismissible>
              {status.message}
            </Alert>
          )}
          <Form onSubmit={handleSubmit} className="servicio-form-grid">
            <Form.Group>
              <Form.Label>Tipo de servicio</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej: Corte clásico"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Precio</Form.Label>
              <Form.Control
                type="number"
                placeholder="Ej: 25000"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                min="0"
              />
            </Form.Group>
            <Button type="submit" variant="dark" disabled={isSaving} className="mt-auto">
              {isSaving ? 'Guardando...' : 'Crear servicio'}
            </Button>
          </Form>
        </article>
      )}
    </section>
  );
}

export default ServiciosPage;