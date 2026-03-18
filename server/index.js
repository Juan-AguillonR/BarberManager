require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { pool, findExistingTable, getTableColumns } = require('./db');

const app = express();
const apiPort = Number(process.env.API_PORT || 4000);
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origen no permitido por CORS'));
    },
  })
);
app.use(express.json());

async function ensureAuthTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios_app (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'API activa' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ message: 'Usuario y contrasena son requeridos.' });
    }

    const [existing] = await pool.query('SELECT id FROM usuarios_app WHERE usuario = ? LIMIT 1', [usuario]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'El usuario ya existe.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios_app (usuario, password_hash) VALUES (?, ?)',
      [usuario, passwordHash]
    );

    return res.status(201).json({
      message: 'Usuario registrado correctamente.',
      user: { id: result.insertId, usuario },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al registrar usuario.', detail: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ message: 'Usuario y contrasena son requeridos.' });
    }

    const [rows] = await pool.query(
      'SELECT id, usuario, password_hash FROM usuarios_app WHERE usuario = ? LIMIT 1',
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales invalidas.' });
    }

    const user = rows[0];
    const passwordIsValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Credenciales invalidas.' });
    }

    return res.json({
      message: 'Login correcto.',
      user: { id: user.id, usuario: user.usuario },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al iniciar sesion.', detail: error.message });
  }
});

app.get('/api/tipos-pago', async (_req, res) => {
  try {
    const table = await findExistingTable(['tipos_pagos', 'barberia_tipos_pagos']);
    if (!table) {
      return res.json([]);
    }

    const [rows] = await pool.query(
      `SELECT tipp_id AS id, tipp_tipo_pago AS tipo, tipp_descripcion AS descripcion FROM ${table} ORDER BY tipp_id ASC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar tipos de pago.', detail: error.message });
  }
});

app.get('/api/servicios', async (_req, res) => {
  try {
    const serviciosTable = await findExistingTable(['servicios', 'barberia_servicios']);
    if (!serviciosTable) {
      return res.json([]);
    }

    const tiposServiciosTable = await findExistingTable(['tipos_servicios', 'barberia_tipos_servicios']);

    if (!tiposServiciosTable) {
      const [rows] = await pool.query(
        `SELECT ser_id AS id, ser_precio AS precio, tur_id AS turnoId, tips_id AS tipoId FROM ${serviciosTable} ORDER BY ser_id ASC`
      );
      return res.json(rows);
    }

    const [rows] = await pool.query(
      `SELECT s.ser_id AS id, s.ser_precio AS precio, s.tur_id AS turnoId, ts.tips_nombre_servicio AS tipo
       FROM ${serviciosTable} s
       LEFT JOIN ${tiposServiciosTable} ts ON ts.tips_id = s.tips_id
       ORDER BY s.ser_id ASC`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar servicios.', detail: error.message });
  }
});

app.get('/api/turnos', async (_req, res) => {
  try {
    const turnosTable = await findExistingTable(['turnos', 'barberia_turnos']);
    if (!turnosTable) {
      return res.json([]);
    }

    const usuariosTable = await findExistingTable(['usuarios', 'barberia_usuarios']);

    if (!usuariosTable) {
      const [rows] = await pool.query(
        `SELECT tur_id AS id, tur_fecha AS fecha, tur_hora AS hora, usu_id AS usuarioId FROM ${turnosTable} ORDER BY tur_fecha DESC, tur_hora DESC`
      );
      return res.json(rows);
    }

    const [rows] = await pool.query(
      `SELECT t.tur_id AS id,
              t.tur_fecha AS fecha,
              t.tur_hora AS hora,
              CONCAT_WS(' ', u.usu_primer_nombre, u.usu_primer_apellido) AS cliente
       FROM ${turnosTable} t
       LEFT JOIN ${usuariosTable} u ON u.usu_id = t.usu_id
       ORDER BY t.tur_fecha DESC, t.tur_hora DESC`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar turnos.', detail: error.message });
  }
});

app.get('/api/usuarios', async (_req, res) => {
  try {
    const usuariosTable = await findExistingTable(['usuarios', 'barberia_usuarios']);
    if (!usuariosTable) {
      return res.json([]);
    }

    const [rows] = await pool.query(
      `SELECT usu_id AS id,
              CONCAT_WS(' ', usu_primer_nombre, usu_primer_apellido) AS nombre
       FROM ${usuariosTable}
       ORDER BY usu_id ASC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar usuarios.', detail: error.message });
  }
});

app.post('/api/turnos', async (req, res) => {
  try {
    const turnosTable = await findExistingTable(['turnos', 'barberia_turnos']);
    if (!turnosTable) {
      return res.status(404).json({ message: 'No existe la tabla de turnos.' });
    }

    const { fecha, hora, usuarioId } = req.body;
    if (!fecha || !hora) {
      return res.status(400).json({ message: 'Fecha y hora son requeridas.' });
    }

    const columns = await getTableColumns(turnosTable);
    if (!columns.includes('tur_fecha') || !columns.includes('tur_hora')) {
      return res.status(500).json({ message: 'La estructura de turnos no es compatible.' });
    }

    let resolvedUserId = usuarioId ?? null;
    if (columns.includes('usu_id') && !resolvedUserId) {
      const usuariosTable = await findExistingTable(['usuarios', 'barberia_usuarios']);
      if (usuariosTable) {
        const [users] = await pool.query(`SELECT usu_id FROM ${usuariosTable} ORDER BY usu_id ASC LIMIT 1`);
        if (users.length > 0) {
          resolvedUserId = users[0].usu_id;
        }
      }
    }

    const insertColumns = ['tur_fecha', 'tur_hora'];
    const insertValues = [fecha, hora];

    if (columns.includes('usu_id') && resolvedUserId) {
      insertColumns.push('usu_id');
      insertValues.push(resolvedUserId);
    }

    const placeholders = insertColumns.map(() => '?').join(', ');
    const [result] = await pool.query(
      `INSERT INTO ${turnosTable} (${insertColumns.join(', ')}) VALUES (${placeholders})`,
      insertValues
    );

    return res.status(201).json({
      message: 'Turno registrado correctamente.',
      turno: {
        id: result.insertId,
        fecha,
        hora,
        usuarioId: resolvedUserId,
      },
    });
  } catch (error) {
    if (error.message.includes('usu_id')) {
      return res.status(400).json({
        message:
          'Debes enviar un usuario valido para registrar el turno (usuarioId existente en la tabla usuarios).',
      });
    }
    return res.status(500).json({ message: 'Error al registrar turno.', detail: error.message });
  }
});

app.get('/api/pagos', async (_req, res) => {
  try {
    const pagosTable = await findExistingTable(['pagos', 'barberia_pagos']);
    if (!pagosTable) {
      return res.json([]);
    }

    const pagosColumns = await getTableColumns(pagosTable);
    const serviciosTable = await findExistingTable(['servicios', 'barberia_servicios']);
    const tiposPagoTable = await findExistingTable(['tipos_pagos', 'barberia_tipos_pagos']);
    const tiposServiciosTable = await findExistingTable(['tipos_servicios', 'barberia_tipos_servicios']);

    const montoSelect = pagosColumns.includes('pag_monto') ? 'p.pag_monto' : 'NULL';
    const fechaSelect = pagosColumns.includes('pag_fecha') ? 'p.pag_fecha' : 'NULL';
    const serJoin = serviciosTable ? `LEFT JOIN ${serviciosTable} s ON s.ser_id = p.ser_id` : '';
    const tservJoin = serviciosTable && tiposServiciosTable
      ? `LEFT JOIN ${tiposServiciosTable} ts ON ts.tips_id = s.tips_id`
      : '';
    const tippJoin = tiposPagoTable ? `LEFT JOIN ${tiposPagoTable} tp ON tp.tipp_id = p.tipp_id` : '';
    const servicioSelect = serviciosTable && tiposServiciosTable
      ? 'ts.tips_nombre_servicio'
      : serviciosTable
        ? 'CONCAT("Servicio #", p.ser_id)'
        : 'NULL';
    const metodoSelect = tiposPagoTable ? 'tp.tipp_tipo_pago' : 'NULL';

    const [rows] = await pool.query(
      `SELECT p.pag_id AS id,
              ${servicioSelect} AS servicio,
              ${metodoSelect} AS metodo,
              ${montoSelect} AS monto,
              ${fechaSelect} AS fecha
       FROM ${pagosTable} p
       ${serJoin}
       ${tservJoin}
       ${tippJoin}
       ORDER BY p.pag_id DESC`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar pagos.', detail: error.message });
  }
});

ensureAuthTable()
  .then(() => {
    app.listen(apiPort, () => {
      // eslint-disable-next-line no-console
      console.log(`API escuchando en http://localhost:${apiPort}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('No se pudo iniciar API:', error.message);
    process.exit(1);
  });
