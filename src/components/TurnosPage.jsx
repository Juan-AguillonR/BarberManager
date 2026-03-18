import './TurnosPage.css';

import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import Alert from 'react-bootstrap/Alert';
import { apiRequest } from '../services/api';

function TurnosPage({ turnos, onTurnoCreated }) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const rows = await apiRequest('/api/usuarios');
        setUsuarios(rows);
      } catch (error) {
        setUsuarios([]);
      }
    };

    loadUsuarios();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (!fecha || !hora) {
      setStatus({ type: 'danger', message: 'Debes seleccionar fecha y hora.' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest('/api/turnos', {
        method: 'POST',
        body: JSON.stringify({ fecha, hora, usuarioId: usuarioId ? Number(usuarioId) : undefined }),
      });
      setStatus({ type: 'success', message: response.message || 'Turno registrado.' });
      setFecha('');
      setHora('');
      setUsuarioId('');
      onTurnoCreated();
    } catch (error) {
      setStatus({ type: 'danger', message: error.message || 'No se pudo registrar el turno.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel-wrap" id="turnos" aria-label="Gestion de turnos">
      <h1 className="panel-title">Gestion de Turnos</h1>

      <article className="panel-block">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
            {turnos.length === 0 ? (
              <tr>
                <td colSpan={4}>No hay turnos registrados.</td>
              </tr>
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

      <article className="panel-block">
        <h2>Reservar nuevo turno</h2>

        {status.message ? <Alert variant={status.type}>{status.message}</Alert> : null}

        <Form onSubmit={handleSubmit} className="turno-form-grid">
          <Form.Select value={usuarioId} onChange={(event) => setUsuarioId(event.target.value)}>
            <option value="">Selecciona cliente (opcional)</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.id} - {usuario.nombre || 'Sin nombre'}
              </option>
            ))}
          </Form.Select>
          <Form.Control type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
          <Form.Control type="time" value={hora} onChange={(event) => setHora(event.target.value)} />
          <Button type="submit" variant="dark" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Reservar'}
          </Button>
        </Form>
      </article>
    </section>
  );
}

export default TurnosPage;
