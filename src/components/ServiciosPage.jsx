import { useState } from 'react';
import './ServiciosPage.css';
import Table from 'react-bootstrap/Table';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import { apiRequest } from '../services/api';

function ServiciosPage({ servicios: serviciosProp, descuentos = [], user, onServicioCreado }) {
  // ── Servicio ───────────────────────────────────────────────────────────────
  const [tipo, setTipo] = useState('');
  const [precio, setPrecio] = useState('');
  const [statusServicio, setStatusServicio] = useState({ type: '', message: '' });
  const [isSavingServicio, setIsSavingServicio] = useState(false);
  const [serviciosLocales, setServiciosLocales] = useState(null);

  // ── Descuento ──────────────────────────────────────────────────────────────
  const [servicioId, setServicioId] = useState('');
  const [cortesRequeridos, setCortesRequeridos] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [activo, setActivo] = useState(true);
  const [statusDescuento, setStatusDescuento] = useState({ type: '', message: '' });
  const [isSavingDescuento, setIsSavingDescuento] = useState(false);

  const esAdmin = user?.rol === 'admin';
  const servicios = serviciosLocales ?? serviciosProp;

  const handleSubmitServicio = async (event) => {
    event.preventDefault();
    setStatusServicio({ type: '', message: '' });

    if (!tipo.trim() || precio === '') {
      setStatusServicio({ type: 'danger', message: 'Debes indicar nombre y precio del servicio.' });
      return;
    }

    setIsSavingServicio(true);
    try {
      await apiRequest('/api/servicios', {
        method: 'POST',
        body: JSON.stringify({ tipo: tipo.trim(), precio: Number(precio) }),
      }, user);

      const actualizados = await apiRequest('/api/servicios', { method: 'GET' }, user);
      setServiciosLocales(Array.isArray(actualizados) ? actualizados : actualizados.servicios ?? []);

      setStatusServicio({ type: 'success', message: 'Servicio registrado correctamente.' });
      setTipo('');
      setPrecio('');
      if (onServicioCreado) onServicioCreado();
    } catch (error) {
      setStatusServicio({ type: 'danger', message: error.message || 'No se pudo registrar el servicio.' });
    } finally {
      setIsSavingServicio(false);
    }
  };

  const handleGuardarDescuento = async (event) => {
    event.preventDefault();
    setStatusDescuento({ type: '', message: '' });

    if (!servicioId || !cortesRequeridos || !porcentaje) {
      setStatusDescuento({ type: 'danger', message: 'Debes completar servicio, cortes requeridos y porcentaje.' });
      return;
    }

    setIsSavingDescuento(true);
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

      setStatusDescuento({ type: 'success', message: response.message || 'Descuento guardado.' });
      setServicioId('');
      setCortesRequeridos('');
      setPorcentaje('');
      setActivo(true);
      if (onServicioCreado) onServicioCreado();
    } catch (error) {
      setStatusDescuento({ type: 'danger', message: error.message || 'No se pudo guardar el descuento.' });
    } finally {
      setIsSavingDescuento(false);
    }
  };

  return (
    <section className="panel-wrap" id="servicios" aria-label="Listado de servicios">
      <h1 className="panel-title">Servicios</h1>

      {/* ── Registrar servicio ── */}
      {esAdmin && (
        <article className="panel-block" data-testid="servicios-form-section">
          <h2>Registrar nuevo servicio</h2>
          {statusServicio.message && (
            <Alert variant={statusServicio.type} data-testid="servicios-alert">{statusServicio.message}</Alert>
          )}
          <Form onSubmit={handleSubmitServicio} data-testid="servicios-form" className="turno-form-grid">
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
            <Button type="submit" variant="dark" disabled={isSavingServicio} data-testid="servicio-submit">
              {isSavingServicio ? 'Guardando...' : 'Guardar servicio'}
            </Button>
          </Form>
        </article>
      )}

      {/* ── Tabla de servicios ── */}
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

      {/* ── Descuentos (solo admin) ── */}
      {esAdmin && (
        <>
          <article className="panel-block">
            <h2>Configurar descuento por cortes previos</h2>
            {statusDescuento.message && (
              <Alert variant={statusDescuento.type}>{statusDescuento.message}</Alert>
            )}
            <Form onSubmit={handleGuardarDescuento} className="turno-form-grid">
              <Form.Group>
                <Form.Label>Servicio</Form.Label>
                <Form.Select value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
                  <option value="">Selecciona un servicio</option>
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.tipo || `Servicio #${s.id}`}{s.precio !== undefined ? ` - $${s.precio}` : ''}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group>
                <Form.Label>Cortes previos requeridos</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={cortesRequeridos}
                  onChange={(e) => setCortesRequeridos(e.target.value)}
                  placeholder="Ej: 5"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Porcentaje de descuento</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  placeholder="Ej: 10"
                />
              </Form.Group>
              <Form.Check
                type="switch"
                id="descuento-activo"
                label="Descuento activo"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />
              <Button type="submit" variant="dark" disabled={isSavingDescuento}>
                {isSavingDescuento ? 'Guardando...' : 'Guardar descuento'}
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
                      <td>{Number(descuento.activo) === 1 ? 'Sí' : 'No'}</td>
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