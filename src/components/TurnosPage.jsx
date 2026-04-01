import './TurnosPage.css';
import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import Alert from 'react-bootstrap/Alert';
import { apiRequest } from '../services/api';

function TurnosPage({ turnos = [], onTurnoCreado, user }) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [u, s] = await Promise.all([
          apiRequest('/api/usuarios', {}, user),
          apiRequest('/api/servicios', {}, user),
        ]);
        setUsuarios(Array.isArray(u) ? u : []);
        setServicios(Array.isArray(s) ? s : []);
      } catch { }
    };
    cargar();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!fecha || !hora) {
      setStatus({ type: 'danger', message: 'Debes seleccionar fecha y hora.' });
      return;
    }
    if (!servicioId) {
      setStatus({ type: 'danger', message: 'Debes seleccionar un servicio.' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest('/api/turnos', {
        method: 'POST',
        body: JSON.stringify({
          fecha, hora,
          usuarioId: usuarioId ? Number(usuarioId) : undefined,
          servicioId: Number(servicioId),
        }),
      }, user);
      setStatus({ type: 'success', message: response.message || 'Turno registrado.' });
      setFecha(''); setHora(''); setUsuarioId(''); setServicioId('');
      onTurnoCreado();
    } catch (error) {
      setStatus({ type: 'danger', message: error.message || 'No se pudo registrar el turno.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel-wrap" id="turnos" aria-label="Gestión de turnos">
      <h1 className="panel-title">Gestión de Turnos</h1>

      <article className="panel-block">
        <Table striped bordered hover responsive>
          <thead>
            <tr><th>ID</th><th>Cliente</th><th>Servicio</th><th>Fecha</th><th>Hora</th></tr>
          </thead>
          <tbody>
            {turnos.length === 0 ? (
              <tr><td colSpan={5}>No hay turnos registrados.</td></tr>
            ) : (
              turnos.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.cliente || '-'}</td>
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
        <h2>Reservar nuevo turno</h2>
        {status.message && (
          <Alert variant={status.type} onClose={() => setStatus({ type: '', message: '' })} dismissible>
            {status.message}
          </Alert>
        )}

        <Form onSubmit={handleSubmit} className="turno-form-grid">
          <Form.Group>
            <Form.Label>Cliente</Form.Label>
            <Form.Select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
              <option value="">Selecciona cliente (opcional)</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre || `Cliente #${u.id}`}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Servicio</Form.Label>
            <Form.Select value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
              <option value="">Selecciona servicio</option>
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
            {isSaving ? 'Guardando...' : 'Reservar'}
          </Button>
        </Form>
      </article>
    </section>
  );
}

export default TurnosPage;