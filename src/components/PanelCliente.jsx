import { useState } from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Modal from 'react-bootstrap/Modal';
import Badge from 'react-bootstrap/Badge';
import { apiRequest } from '../services/api';
import './PanelCliente.css';

function PanelCliente({ turnos = [], tiposPago = [], servicios = [], user, onDatosActualizados }) {
  // ── Agendar turno ──────────────────────────────────────────────────────────
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [servicioSeleccionado, setServicioSeleccionado] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  // ── Flujo de pago simulado ─────────────────────────────────────────────────
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [turnoCreado, setTurnoCreado] = useState(null);
  const [pagoConfirmado, setPagoConfirmado] = useState(false);

  const servicioInfo = servicios.find((s) => String(s.id) === String(servicioSeleccionado));

  const handleAgendarSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!fecha || !hora) {
      setStatus({ type: 'danger', message: 'Debes seleccionar fecha y hora.' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest('/api/turnos', {
        method: 'POST',
        body: JSON.stringify({ fecha, hora }),
      }, user);

      setTurnoCreado({ ...response.turno, fecha, hora, servicio: servicioInfo });
      setShowPagoModal(true);
      setFecha(''); setHora(''); setServicioSeleccionado('');
    } catch (error) {
      setStatus({ type: 'danger', message: error.message || 'No se pudo agendar el turno.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmarPago = () => {
    if (!metodoPago) return;
    setPagoConfirmado(true);
    // En producción aquí se haría POST /api/pagos
    setTimeout(() => {
      setShowPagoModal(false);
      setPagoConfirmado(false);
      setMetodoPago('');
      setTurnoCreado(null);
      if (onDatosActualizados) onDatosActualizados();
      setStatus({ type: 'success', message: '✅ Turno agendado correctamente. Tu pago quedó registrado.' });
    }, 1500);
  };

  const handleSaltarPago = () => {
    setShowPagoModal(false);
    setTurnoCreado(null);
    setMetodoPago('');
    if (onDatosActualizados) onDatosActualizados();
    setStatus({ type: 'warning', message: '⚠️ Turno agendado. Recuerda pagar el día de tu cita.' });
  };

  return (
    <section className="panel-wrap" aria-label="Panel del cliente">
      <h1 className="panel-title">Mi Panel</h1>

      {/* ── Agendar turno ── */}
      <article className="panel-block">
        <h2>Agendar nuevo turno</h2>
        {status.message && <Alert variant={status.type} onClose={() => setStatus({ type: '', message: '' })} dismissible>{status.message}</Alert>}

        <Form onSubmit={handleAgendarSubmit} className="turno-form-grid">
          <Form.Group>
            <Form.Label>Servicio (opcional)</Form.Label>
            <Form.Select value={servicioSeleccionado} onChange={(e) => setServicioSeleccionado(e.target.value)}>
              <option value="">Selecciona un servicio</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.tipo || `Servicio #${s.id}`} — ${s.precio}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Fecha</Form.Label>
            <Form.Control type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} min={new Date().toISOString().split('T')[0]} />
          </Form.Group>

          <Form.Group>
            <Form.Label>Hora</Form.Label>
            <Form.Control type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </Form.Group>

          <Button type="submit" variant="dark" disabled={isSaving} className="mt-auto">
            {isSaving ? 'Agendando...' : 'Agendar turno'}
          </Button>
        </Form>
      </article>

      {/* ── Mis turnos ── */}
      <article className="panel-block" id="turnos">
        <h2>Mis Turnos</h2>
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Hora</th></tr>
          </thead>
          <tbody>
            {turnos.length === 0 ? (
              <tr><td colSpan={4}>No hay turnos registrados.</td></tr>
            ) : (
              turnos.map((turno) => (
                <tr key={turno.id}>
                  <td>{turno.id}</td>
                  <td>{turno.cliente || '-'}</td>
                  <td>{String(turno.fecha || '')}</td>
                  <td>{String(turno.hora || '')}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </article>

      {/* ── Servicios disponibles ── */}
      <article className="panel-block" id="servicios">
        <h2>Servicios disponibles</h2>
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr><th>ID</th><th>Tipo</th><th>Precio</th></tr>
          </thead>
          <tbody>
            {servicios.length === 0 ? (
              <tr><td colSpan={3}>No hay servicios registrados.</td></tr>
            ) : (
              servicios.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.tipo || '-'}</td>
                  <td>${s.precio ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </article>

      {/* ── Tipos de pago ── */}
      <article className="panel-block" id="pagos">
        <h2>Métodos de pago aceptados</h2>
        <div className="metodos-pago-grid">
          {tiposPago.length === 0 ? (
            <p className="text-muted">No hay métodos de pago registrados.</p>
          ) : (
            tiposPago.map((tipo) => (
              <div key={tipo.id} className="metodo-pago-card">
                <span className="metodo-pago-nombre">{tipo.tipo || '-'}</span>
                {tipo.descripcion && <small className="text-muted">{tipo.descripcion}</small>}
              </div>
            ))
          )}
        </div>
      </article>

      {/* ── Modal de pago simulado ── */}
      <Modal show={showPagoModal} onHide={handleSaltarPago} centered>
        <Modal.Header closeButton>
          <Modal.Title>💳 Confirmar pago</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pagoConfirmado ? (
            <div className="text-center py-3">
              <div style={{ fontSize: '3rem' }}>✅</div>
              <p className="mt-2 fw-bold">¡Pago registrado exitosamente!</p>
            </div>
          ) : (
            <>
              <div className="resumen-turno">
                <p><strong>Fecha:</strong> {turnoCreado?.fecha}</p>
                <p><strong>Hora:</strong> {turnoCreado?.hora}</p>
                {turnoCreado?.servicio && (
                  <>
                    <p><strong>Servicio:</strong> {turnoCreado.servicio.tipo}</p>
                    <p><strong>Precio:</strong> <Badge bg="success">${turnoCreado.servicio.precio}</Badge></p>
                  </>
                )}
              </div>
              <hr />
              <Form.Group>
                <Form.Label><strong>Método de pago</strong></Form.Label>
                <Form.Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  <option value="">Selecciona un método</option>
                  {tiposPago.map((tp) => (
                    <option key={tp.id} value={tp.tipo}>{tp.tipo}</option>
                  ))}
                  {tiposPago.length === 0 && (
                    <>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Transferencia">Transferencia</option>
                    </>
                  )}
                </Form.Select>
              </Form.Group>
              <small className="text-muted mt-2 d-block">
                * El pago es simulado. No se realizará ningún cobro real.
              </small>
            </>
          )}
        </Modal.Body>
        {!pagoConfirmado && (
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={handleSaltarPago}>Pagar después</Button>
            <Button variant="success" onClick={handleConfirmarPago} disabled={!metodoPago}>
              Confirmar pago
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </section>
  );
}

export default PanelCliente;