import { useState } from 'react';
import './ServiciosPage.css';
import Table from 'react-bootstrap/Table';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import { apiRequest } from '../services/api';

function ServiciosPage({ servicios = [], descuentos = [], user, onServicioCreado }) {
  // --- Estados para la creación de Servicios (HEAD) ---
  const [tipo, setTipo] = useState('');
  const [precio, setPrecio] = useState('');
  
  // --- Estados para la configuración de Descuentos (9dd650c) ---
  const [servicioId, setServicioId] = useState('');
  const [cortesRequeridos, setCortesRequeridos] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [activo, setActivo] = useState(true);

  // --- Estados compartidos ---
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  const esAdmin = user?.rol === 'admin';

  // --- Manejador para crear Servicios (HEAD) ---
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

  // --- Manejador para guardar Descuentos (9dd650c) ---
  const handleGuardarDescuento = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (!servicioId || !cortesRequeridos || !porcentaje) {
      setStatus({ type: 'danger', message: 'Debes completar servicio, cortes requeridos y porcentaje.' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest('/api/descuentos', {
        method: 'POST',
        body: JSON.stringify({
          servicioId: Number(servicioId),
          cortesRequeridos: Number(cortesRequeridos),
          porcentaje: Number(porcentaje),
          activo,
        }),
      }, user);

      setStatus({ type: 'success', message: response.message || 'Descuento guardado.' });
      setServicioId('');
      setCortesRequeridos('');
      setPorcentaje('');
      setActivo(true);
      if (onServicioCreado) onServicioCreado();
    } catch (error) {
      setStatus({ type: 'danger', message: error.message || 'No se pudo guardar el descuento.' });
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

      {esAdmin && (
        <>
          <article className="panel-block">
            <h2>Configurar descuento por cortes previos</h2>
            {status.message && <Alert variant={status.type}>{status.message}</Alert>}
            <Form onSubmit={handleGuardarDescuento} className="turno-form-grid">
              <Form.Select value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
                <option value="">Selecciona un servicio</option>
                {servicios.map((servicio) => (
                  <option key={servicio.id} value={servicio.id}>
                    {servicio.tipo || `Servicio #${servicio.id}`} {servicio.precio !== undefined ? `- $${servicio.precio}` : ''}
                  </option>
                ))}
              </Form.Select>

              <Form.Control
                type="number"
                min="1"
                value={cortesRequeridos}
                onChange={(e) => setCortesRequeridos(e.target.value)}
                placeholder="Cortes previos requeridos"
              />

              <Form.Control
                type="number"
                min="1"
                max="100"
                step="0.01"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
                placeholder="Porcentaje de descuento"
              />

              <Form.Check
                type="switch"
                id="descuento-activo"
                label="Descuento activo"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />

              <Button type="submit" variant="dark" disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar descuento'}
              </Button>
            </Form>
          </article>

          <article className="panel-block">
            <h2>Descuentos configurados</h2>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Servicio</th>
                  <th>Cortes requeridos</th>
                  <th>Porcentaje</th>
                  <th>Activo</th>
                </tr>
              </thead>
              <tbody>
                {descuentos.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay descuentos configurados.</td>
                  </tr>
                ) : (
                  descuentos.map((descuento) => (
                    <tr key={descuento.id}>
                      <td>{descuento.id}</td>
                      <td>{descuento.servicio || `Servicio #${descuento.servicioId}`}</td>
                      <td>{descuento.cortesRequeridos}</td>
                      <td>{descuento.porcentaje}%</td>
                      <td>{Number(descuento.activo) === 1 ? 'Si' : 'No'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </article>
        </>
      )}
    </section>
  );
}

export default ServiciosPage;