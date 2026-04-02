import { useState, useEffect } from 'react';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Modal from 'react-bootstrap/Modal';
import Badge from 'react-bootstrap/Badge';
import { apiRequest } from '../services/api';
import './PanelCliente.css';

function PanelCliente({ turnos = [], tiposPago = [], servicios = [], user, onDatosActualizados }) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [showPagoModal, setShowPagoModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [turnoCreado, setTurnoCreado] = useState(null);
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [descuentoInfo, setDescuentoInfo] = useState({ descuento: 0, totalTurnos: 0 });

  const servicioInfo = servicios.find((s) => String(s.id) === String(servicioId));

  // Cargar descuento del usuario al montar
  useEffect(() => {
    const cargarDescuento = async () => {
      if (!user?.usu_id) return;
      try {
        const data = await apiRequest(`/api/descuento/${user.usu_id}`, {}, user);
        setDescuentoInfo(data);
      } catch { }
    };
    cargarDescuento();
  }, [user, turnos]);

  const precioOriginal = turnoCreado?.servicio?.precio ?? 0;
  const descuentoPct = descuentoInfo.descuento;
  const montoDescuento = precioOriginal * descuentoPct / 100;
  const montoFinal = precioOriginal - montoDescuento;

  const handleAgendarSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!fecha || !hora) { setStatus({ type: 'danger', message: 'Debes seleccionar fecha y hora.' }); return; }
    if (!servicioId) { setStatus({ type: 'danger', message: 'Debes seleccionar un servicio.' }); return; }

    setIsSaving(true);
    try {
      const response = await apiRequest('/api/turnos', {
        method: 'POST',
        body: JSON.stringify({ fecha, hora, usuarioId: user?.usu_id ?? null, servicioId: Number(servicioId) }),
      }, user);

      // Recalcular descuento con el nuevo turno incluido
      const nuevoTotal = descuentoInfo.totalTurnos + 1;
      const nuevoDescuento = nuevoTotal >= 3 ? 10 : 0;
      setDescuentoInfo({ descuento: nuevoDescuento, totalTurnos: nuevoTotal });

      setTurnoCreado({ ...response.turno, fecha, hora, servicio: servicioInfo });
      setShowPagoModal(true);
      setFecha(''); setHora(''); setServicioId('');
    } catch (error) {
      setStatus({ type: 'danger', message: error.message || 'No se pudo agendar el turno.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmarPago = () => {
    if (!metodoPago) return;
    setPagoConfirmado(true);

    apiRequest('/api/pagos', {
      method: 'POST',
      body: JSON.stringify({
        metodoPago,
        monto: precioOriginal,
        descuento: descuentoPct,
        servicioId: turnoCreado?.servicioId ?? null,
      }),
    }, user).catch(() => {});

    setTimeout(() => {
      setShowPagoModal(false);
      setPagoConfirmado(false);
      setMetodoPago('');
      setTurnoCreado(null);
      if (onDatosActualizados) onDatosActualizados();
      setStatus({ type: 'success', message: '✅ Turno agendado y pago registrado correctamente.' });
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

      {/* Indicador de descuento */}
      {descuentoInfo.totalTurnos > 0 && (
        <div className="descuento-banner">
          {descuentoInfo.descuento > 0 ? (
            <Alert variant="success" className="mb-0">
              🎉 Tienes <strong>{descuentoInfo.descuento}% de descuento</strong> por tu fidelidad —
              llevas <strong>{descuentoInfo.totalTurnos} turnos</strong> con nosotros.
            </Alert>
          ) : (
            <Alert variant="info" className="mb-0">
              📅 Llevas <strong>{descuentoInfo.totalTurnos} turno(s)</strong>. 
              Con <strong>{3 - descuentoInfo.totalTurnos} más</strong> obtienes 10% de descuento.
            </Alert>
          )}
        </div>
      )}

      <article className="panel-block">
        <h2>Agendar nuevo turno</h2>
        {status.message && (
          <Alert variant={status.type} onClose={() => setStatus({ type: '', message: '' })} dismissible>
            {status.message}
          </Alert>
        )}

        <Form onSubmit={handleAgendarSubmit} className="turno-form-grid">
          <Form.Group>
            <Form.Label>Servicio</Form.Label>
            <Form.Select value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
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
            <Form.Control type="date" value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={new Date().toISOString().split('T')[0]} />
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

      <article className="panel-block">
        <h2>Mis Turnos</h2>
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr><th>ID</th><th>Servicio</th><th>Fecha</th><th>Hora</th></tr>
          </thead>
          <tbody>
            {turnos.length === 0 ? (
              <tr><td colSpan={4}>No hay turnos registrados.</td></tr>
            ) : (
              turnos.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.servicio || '-'}</td>
                  <td>{String(t.fecha || '')}</td>
                  <td>{String(t.hora || '')}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </article>

      <article className="panel-block">
        <h2>Servicios disponibles</h2>
        <Table striped bordered hover responsive size="sm">
          <thead><tr><th>Servicio</th><th>Precio</th></tr></thead>
          <tbody>
            {servicios.length === 0 ? (
              <tr><td colSpan={2}>No hay servicios registrados.</td></tr>
            ) : (
              servicios.map((s) => (
                <tr key={s.id}>
                  <td>{s.tipo || '-'}</td>
                  <td>${s.precio ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </article>

      <article className="panel-block">
        <h2>Métodos de pago aceptados</h2>
        <div className="metodos-pago-grid">
          {tiposPago.length === 0 ? (
            <p className="text-muted">No hay métodos de pago registrados.</p>
          ) : (
            tiposPago.map((tp) => (
              <div key={tp.id} className="metodo-pago-card">
                <span className="metodo-pago-nombre">{tp.tipo}</span>
                {tp.descripcion && <small className="text-muted">{tp.descripcion}</small>}
              </div>
            ))
          )}
        </div>
      </article>

      {/* Modal de pago con descuento */}
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
                    <p><strong>Precio original:</strong> ${precioOriginal}</p>
                    {descuentoPct > 0 && (
                      <>
                        <p><strong>Descuento:</strong> <Badge bg="warning" text="dark">{descuentoPct}% por fidelidad</Badge> — ahorra ${montoDescuento.toFixed(2)}</p>
                        <p><strong>Total a pagar:</strong> <Badge bg="success">${montoFinal.toFixed(2)}</Badge></p>
                      </>
                    )}
                    {descuentoPct === 0 && (
                      <p><strong>Total a pagar:</strong> <Badge bg="success">${precioOriginal}</Badge></p>
                    )}
                  </>
                )}
              </div>
              <hr />
              <Form.Group>
                <Form.Label><strong>Método de pago</strong></Form.Label>
                <Form.Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  <option value="">Selecciona un método</option>
                  {tiposPago.length > 0
                    ? tiposPago.map((tp) => <option key={tp.id} value={tp.tipo}>{tp.tipo}</option>)
                    : <>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Transferencia">Transferencia</option>
                      </>
                  }
                </Form.Select>
              </Form.Group>
              <small className="text-muted mt-2 d-block">* El pago es simulado. No se realizará ningún cobro real.</small>
            </>
          )}
        </Modal.Body>
        {!pagoConfirmado && (
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={handleSaltarPago}>Pagar después</Button>
            <Button variant="success" onClick={handleConfirmarPago} disabled={!metodoPago}>Confirmar pago</Button>
          </Modal.Footer>
        )}
      </Modal>
    </section>
  );
}

export default PanelCliente;