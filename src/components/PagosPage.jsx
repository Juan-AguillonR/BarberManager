import './PagosPage.css';
import Table from 'react-bootstrap/Table';

function PagosPage({ pagos }) {
  return (
    <section className="panel-wrap" id="pagos" aria-label="Registro de pagos">
      <h1 className="panel-title">Registro de Pagos</h1>

      <article className="panel-block">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Servicio</th>
              <th>Metodo</th>
              <th>Monto</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 ? (
              <tr>
                <td colSpan={5}>No hay pagos registrados.</td>
              </tr>
            ) : (
              pagos.map((pago) => (
                <tr key={pago.id}>
                  <td>{pago.id}</td>
                  <td>{pago.servicio || '-'}</td>
                  <td>{pago.metodo || '-'}</td>
                  <td>{pago.monto ?? '-'}</td>
                  <td>{pago.fecha ? String(pago.fecha) : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </article>
    </section>
  );
}

export default PagosPage;
