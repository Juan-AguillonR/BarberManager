import Table from 'react-bootstrap/Table';
import './PanelCliente.css';

function PanelCliente({ turnos, tiposPago, servicios }) {
  return (
    <section className="panel-wrap" aria-label="Panel de datos">
      <h1 className="panel-title">Panel del cliente</h1>

      <article className="panel-block" id="turnos">
        <h2>Turnos</h2>
        <Table striped bordered hover responsive size="sm">
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

      <article className="panel-block" id="servicios">
        <h2>Servicios</h2>
        <Table striped bordered hover responsive size="sm">
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
                <tr key={servicio.id}>
                  <td>{servicio.id}</td>
                  <td>{servicio.tipo || '-'}</td>
                  <td>{servicio.precio}</td>
                  <td>{servicio.turnoId ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </article>

      <article className="panel-block" id="pagos">
        <h2>Tipos de pago</h2>
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Descripcion</th>
            </tr>
          </thead>
          <tbody>
            {tiposPago.length === 0 ? (
              <tr>
                <td colSpan={3}>No hay tipos de pago registrados.</td>
              </tr>
            ) : (
              tiposPago.map((tipo) => (
                <tr key={tipo.id}>
                  <td>{tipo.id}</td>
                  <td>{tipo.tipo || '-'}</td>
                  <td>{tipo.descripcion || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </article>
    </section>
  );
}

export default PanelCliente;
