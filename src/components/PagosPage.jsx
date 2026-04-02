import './PagosPage.css';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';

function PagosPage({ pagos = [] }) {
  return (
    <section className="panel-wrap" id="pagos" aria-label="Registro de pagos">
      <h1 className="panel-title">Registro de Pagos</h1>

      <article className="panel-block">
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Servicio</th>
              <th>Método</th>
              <th>Precio original</th>
              <th>Descuento</th>
              <th>Total pagado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 ? (
              <tr><td colSpan={7}>No hay pagos registrados.</td></tr>
            ) : (
              pagos.map((pago) => (
                <tr key={pago.id}>
                  <td>{pago.id}</td>
                  <td>{pago.servicio || '-'}</td>
                  <td>{pago.metodo || '-'}</td>
                  <td>${pago.monto ?? '-'}</td>
                  <td>
                    {pago.descuento > 0
                      ? <Badge bg="warning" text="dark">{pago.descuento}%</Badge>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    {pago.monto_final != null
                      ? <strong>${Number(pago.monto_final).toFixed(2)}</strong>
                      : `$${pago.monto ?? '-'}`
                    }
                  </td>
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