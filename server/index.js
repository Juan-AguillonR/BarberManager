require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { pool, findExistingTable, getTableColumns } = require('./db');

const app = express();
const apiPort = Number(process.env.API_PORT || 4000);
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

// RNF6: control de intentos fallidos en memoria
const loginAttempts = {};
const BLOCK_AFTER = 5;
const BLOCK_MINUTES = 15;
const CAPTCHA_AFTER = 3;

function getAttemptInfo(usuario) {
  if (!loginAttempts[usuario]) loginAttempts[usuario] = { count: 0, blockedUntil: null };
  return loginAttempts[usuario];
}

function isBlocked(usuario) {
  const info = getAttemptInfo(usuario);
  if (info.blockedUntil && new Date() < new Date(info.blockedUntil)) return true;
  if (info.blockedUntil && new Date() >= new Date(info.blockedUntil)) {
    loginAttempts[usuario] = { count: 0, blockedUntil: null };
  }
  return false;
}

function registerFailedAttempt(usuario) {
  const info = getAttemptInfo(usuario);
  info.count += 1;
  if (info.count >= BLOCK_AFTER) {
    info.blockedUntil = new Date(Date.now() + BLOCK_MINUTES * 60 * 1000).toISOString();
  }
}

function clearAttempts(usuario) {
  loginAttempts[usuario] = { count: 0, blockedUntil: null };
}

// RNF4: escribir log en archivo y en DB
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

function writeLog(usuario, accion, detalle = '') {
  const fecha = new Date().toISOString();
  const linea = `[${fecha}] usuario=${usuario} accion=${accion} detalle=${detalle}\n`;
  const archivo = path.join(LOG_DIR, `auditoria_${fecha.slice(0, 10)}.log`);
  fs.appendFileSync(archivo, linea);
  pool.query(
    'INSERT IGNORE INTO logs_auditoria (usuario, accion, detalle, fecha) VALUES (?, ?, ?, NOW())',
    [usuario, accion, detalle]
  ).catch(() => {});
}

// RNF1: validar contraseña — mínimo 5 caracteres y al menos 1 carácter especial
function validarPassword(password) {
  if (!password || password.length < 5)
    return 'La contraseña debe tener al menos 5 caracteres.';
  if (!/[^a-zA-Z0-9]/.test(password))
    return 'La contraseña debe incluir al menos un carácter especial (ej: @, #, !, %).';
  return null;
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) { callback(null, true); return; }
    callback(new Error('Origen no permitido por CORS'));
  },
}));
app.use(express.json());

// RNF2: verificar que el usuario tenga el rol requerido
function requireRole(...roles) {
  return (req, res, next) => {
    const rolHeader = req.headers['x-user-rol'];
    if (!rolHeader || !roles.includes(rolHeader)) {
      return res.status(403).json({ message: 'Acceso denegado: rol insuficiente.' });
    }
    next();
  };
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      usu_id INT AUTO_INCREMENT PRIMARY KEY,
      usu_primer_nombre VARCHAR(100) NOT NULL,
      usu_primer_apellido VARCHAR(100) NOT NULL DEFAULT '',
      usu_telefono VARCHAR(20) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usu_telefono VARCHAR(20) DEFAULT NULL`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios_app (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      rol ENUM('cliente','barbero','admin') NOT NULL DEFAULT 'cliente',
      usu_id INT NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usu_id) REFERENCES usuarios(usu_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`ALTER TABLE usuarios_app ADD COLUMN IF NOT EXISTS usu_id INT NULL`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs_auditoria (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(100) NOT NULL,
      accion VARCHAR(100) NOT NULL,
      detalle TEXT,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tipos_servicios (
      tips_id INT AUTO_INCREMENT PRIMARY KEY,
      tips_nombre_servicio VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS servicios (
      ser_id INT AUTO_INCREMENT PRIMARY KEY,
      tips_id INT,
      ser_precio DECIMAL(10,2),
      FOREIGN KEY (tips_id) REFERENCES tipos_servicios(tips_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Turno ligado a servicio (ser_id)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS turnos (
      tur_id INT AUTO_INCREMENT PRIMARY KEY,
      usu_id INT NULL,
      ser_id INT NULL,
      tur_fecha DATE NOT NULL,
      tur_hora TIME NOT NULL,
      FOREIGN KEY (usu_id) REFERENCES usuarios(usu_id),
      FOREIGN KEY (ser_id) REFERENCES servicios(ser_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`ALTER TABLE turnos ADD COLUMN IF NOT EXISTS ser_id INT NULL`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tipos_pagos (
      tipp_id INT AUTO_INCREMENT PRIMARY KEY,
      tipp_tipo_pago VARCHAR(50) NOT NULL,
      tipp_descripcion VARCHAR(200)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pagos (
      pag_id INT AUTO_INCREMENT PRIMARY KEY,
      ser_id INT NULL,
      tipp_id INT NULL,
      pag_monto DECIMAL(10,2),
      pag_descuento INT DEFAULT 0,
      pag_monto_final DECIMAL(10,2),
      pag_fecha DATE,
      FOREIGN KEY (ser_id) REFERENCES servicios(ser_id),
      FOREIGN KEY (tipp_id) REFERENCES tipos_pagos(tipp_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await pool.query(`ALTER TABLE pagos ADD COLUMN IF NOT EXISTS pag_descuento INT DEFAULT 0`).catch(() => {});
  await pool.query(`ALTER TABLE pagos ADD COLUMN IF NOT EXISTS pag_monto_final DECIMAL(10,2)`).catch(() => {});

  const [existing] = await pool.query('SELECT COUNT(*) as total FROM tipos_pagos');
  if (existing[0].total === 0) {
    await pool.query(`
      INSERT INTO tipos_pagos (tipp_tipo_pago, tipp_descripcion) VALUES
        ('Efectivo', 'Pago en efectivo en el local'),
        ('Tarjeta', 'Tarjeta débito o crédito'),
        ('Transferencia', 'Transferencia bancaria')
    `);
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'API activa' }));

// RNF1 + RNF3: registro con nombre, apellido, teléfono, validación y hash
app.post('/api/auth/register', async (req, res) => {
  try {
    const { usuario, password, rol = 'cliente', nombre, apellido, telefono } = req.body;

    if (!usuario || !password)
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });

    if (!nombre || !apellido)
      return res.status(400).json({ message: 'Nombre y apellido son requeridos.' });

    if (!telefono)
      return res.status(400).json({ message: 'El teléfono es requerido.' });

    const errorPassword = validarPassword(password);
    if (errorPassword) return res.status(400).json({ message: errorPassword });

    // RNF2: solo admin puede crear barberos o admins
    if (rol === 'barbero' || rol === 'admin') {
      const rolSolicitante = req.headers['x-user-rol'];
      if (rolSolicitante !== 'admin')
        return res.status(403).json({ message: 'Solo un admin puede asignar ese rol.' });
    }

    const [existing] = await pool.query('SELECT id FROM usuarios_app WHERE usuario = ? LIMIT 1', [usuario]);
    if (existing.length > 0)
      return res.status(409).json({ message: 'El usuario ya existe.' });

    // RNF3: hash seguro
    const passwordHash = await bcrypt.hash(password, 12);

    // Guardar nombre, apellido y teléfono en usuarios
    const [usuResult] = await pool.query(
      'INSERT INTO usuarios (usu_primer_nombre, usu_primer_apellido, usu_telefono) VALUES (?, ?, ?)',
      [nombre.trim(), apellido.trim(), telefono.trim()]
    );

    const [result] = await pool.query(
      'INSERT INTO usuarios_app (usuario, password_hash, rol, usu_id) VALUES (?, ?, ?, ?)',
      [usuario, passwordHash, rol, usuResult.insertId]
    );

    writeLog(usuario, 'REGISTRO', `rol=${rol}`);
    return res.status(201).json({
      message: 'Usuario registrado correctamente.',
      user: { id: result.insertId, usuario, rol, usu_id: usuResult.insertId }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al registrar usuario.', detail: error.message });
  }
});

// RNF1 + RNF6: login con bloqueo y captcha
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, password, captchaValid } = req.body;

    if (!usuario || !password)
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });

    if (isBlocked(usuario)) {
      writeLog(usuario, 'LOGIN_BLOQUEADO', 'Demasiados intentos fallidos');
      return res.status(429).json({
        message: `Cuenta bloqueada por ${BLOCK_MINUTES} minutos. Intenta más tarde.`,
        blocked: true
      });
    }

    const info = getAttemptInfo(usuario);
    if (info.count >= CAPTCHA_AFTER && !captchaValid) {
      return res.status(400).json({ message: 'Debes completar el CAPTCHA.', needsCaptcha: true });
    }

    const [rows] = await pool.query(
      `SELECT a.id, a.usuario, a.password_hash, a.rol, a.usu_id,
              CONCAT_WS(' ', u.usu_primer_nombre, u.usu_primer_apellido) AS nombre_completo
       FROM usuarios_app a
       LEFT JOIN usuarios u ON u.usu_id = a.usu_id
       WHERE a.usuario = ? LIMIT 1`,
      [usuario]
    );

    if (rows.length === 0) {
      registerFailedAttempt(usuario);
      writeLog(usuario, 'LOGIN_FALLIDO', 'Usuario no encontrado');
      return res.status(401).json({
        message: 'Credenciales inválidas.',
        intentosRestantes: BLOCK_AFTER - getAttemptInfo(usuario).count
      });
    }

    const user = rows[0];
    const passwordIsValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordIsValid) {
      registerFailedAttempt(usuario);
      writeLog(usuario, 'LOGIN_FALLIDO', `intentos=${getAttemptInfo(usuario).count}`);
      const restantes = BLOCK_AFTER - getAttemptInfo(usuario).count;
      return res.status(401).json({
        message: `Credenciales inválidas. Te quedan ${restantes} intento(s).`,
        intentosRestantes: restantes,
        needsCaptcha: getAttemptInfo(usuario).count >= CAPTCHA_AFTER
      });
    }

    clearAttempts(usuario);
    writeLog(usuario, 'LOGIN_EXITOSO', `rol=${user.rol}`);
    return res.json({
      message: 'Login correcto.',
      user: { id: user.id, usuario: user.usuario, rol: user.rol, usu_id: user.usu_id, nombre: user.nombre_completo || user.usuario }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al iniciar sesión.', detail: error.message });
  }
});

// RNF4: ver logs, solo admin
app.get('/api/logs', requireRole('admin'), async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM logs_auditoria ORDER BY fecha DESC LIMIT 200');
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener logs.', detail: error.message });
  }
});

app.get('/api/tipos-pago', async (_req, res) => {
  try {
    const table = await findExistingTable(['tipos_pagos', 'barberia_tipos_pagos']);
    if (!table) return res.json([]);
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
    if (!serviciosTable) return res.json([]);
    const tiposServiciosTable = await findExistingTable(['tipos_servicios', 'barberia_tipos_servicios']);
    if (!tiposServiciosTable) {
      const [rows] = await pool.query(
        `SELECT ser_id AS id, ser_precio AS precio, tips_id AS tipoId FROM ${serviciosTable} ORDER BY ser_id ASC`
      );
      return res.json(rows);
    }
    const [rows] = await pool.query(
      `SELECT s.ser_id AS id, s.ser_precio AS precio, ts.tips_nombre_servicio AS tipo
       FROM ${serviciosTable} s
       LEFT JOIN ${tiposServiciosTable} ts ON ts.tips_id = s.tips_id
       ORDER BY s.ser_id ASC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar servicios.', detail: error.message });
  }
});

// RNF2: solo admin puede crear servicios
app.post('/api/servicios', requireRole('admin'), async (req, res) => {
  try {
    const { tipo, precio } = req.body;
    if (!tipo || precio === undefined)
      return res.status(400).json({ message: 'Tipo y precio son requeridos.' });

    const tiposServiciosTable = await findExistingTable(['tipos_servicios', 'barberia_tipos_servicios']);
    const serviciosTable = await findExistingTable(['servicios', 'barberia_servicios']);
    if (!tiposServiciosTable || !serviciosTable)
      return res.status(404).json({ message: 'No se encontraron las tablas de servicios.' });

    const [tipoResult] = await pool.query(
      `INSERT INTO ${tiposServiciosTable} (tips_nombre_servicio) VALUES (?)`, [tipo]
    );
    const [serResult] = await pool.query(
      `INSERT INTO ${serviciosTable} (tips_id, ser_precio) VALUES (?, ?)`,
      [tipoResult.insertId, precio]
    );

    const usuario = req.headers['x-user-usuario'] || 'admin';
    writeLog(usuario, 'SERVICIO_CREADO', `tipo=${tipo} precio=${precio}`);
    return res.status(201).json({ message: 'Servicio creado correctamente.', id: serResult.insertId });
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear servicio.', detail: error.message });
  }
});

// Turnos GET — incluye nombre del servicio
app.get('/api/turnos', async (_req, res) => {
  try {
    const turnosTable = await findExistingTable(['turnos', 'barberia_turnos']);
    if (!turnosTable) return res.json([]);

    const usuariosTable = await findExistingTable(['usuarios', 'barberia_usuarios']);
    const serviciosTable = await findExistingTable(['servicios', 'barberia_servicios']);
    const tiposServiciosTable = await findExistingTable(['tipos_servicios', 'barberia_tipos_servicios']);

    const clienteSelect = usuariosTable
      ? `CONCAT_WS(' ', u.usu_primer_nombre, u.usu_primer_apellido) AS cliente`
      : `NULL AS cliente`;
    const servicioSelect = serviciosTable && tiposServiciosTable
      ? `ts.tips_nombre_servicio AS servicio`
      : `NULL AS servicio`;
    const usuJoin = usuariosTable ? `LEFT JOIN ${usuariosTable} u ON u.usu_id = t.usu_id` : '';
    const serJoin = serviciosTable ? `LEFT JOIN ${serviciosTable} s ON s.ser_id = t.ser_id` : '';
    const tsJoin = tiposServiciosTable ? `LEFT JOIN ${tiposServiciosTable} ts ON ts.tips_id = s.tips_id` : '';

    const [rows] = await pool.query(
      `SELECT t.tur_id AS id, t.tur_fecha AS fecha, t.tur_hora AS hora,
              ${clienteSelect}, ${servicioSelect}
       FROM ${turnosTable} t ${usuJoin} ${serJoin} ${tsJoin}
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
    if (!usuariosTable) return res.json([]);
    const [rows] = await pool.query(
      `SELECT usu_id AS id, CONCAT_WS(' ', usu_primer_nombre, usu_primer_apellido) AS nombre
       FROM ${usuariosTable} ORDER BY usu_id ASC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar usuarios.', detail: error.message });
  }
});

// Turnos POST — turno ligado a servicio, sin duplicar horario, sin fechas pasadas
app.post('/api/turnos', async (req, res) => {
  try {
    const turnosTable = await findExistingTable(['turnos', 'barberia_turnos']);
    if (!turnosTable) return res.status(404).json({ message: 'No existe la tabla de turnos.' });

    const { fecha, hora, usuarioId, servicioId } = req.body;
    if (!fecha || !hora)
      return res.status(400).json({ message: 'Fecha y hora son requeridas.' });

    // RF8: no permitir fechas pasadas
    if (new Date(`${fecha}T${hora}`) < new Date())
      return res.status(400).json({ message: 'No puedes agendar un turno en una fecha pasada.' });

    // RF2: no duplicar horarios
    const [duplicado] = await pool.query(
      `SELECT tur_id FROM ${turnosTable} WHERE tur_fecha = ? AND tur_hora = ?`,
      [fecha, hora]
    );
    if (duplicado.length > 0)
      return res.status(409).json({ message: 'Ya existe un turno para esa fecha y hora. Elige otro horario.' });

    const insertColumns = ['tur_fecha', 'tur_hora'];
    const insertValues = [fecha, hora];

    if (usuarioId) { insertColumns.push('usu_id'); insertValues.push(usuarioId); }
    if (servicioId) { insertColumns.push('ser_id'); insertValues.push(servicioId); }

    const placeholders = insertColumns.map(() => '?').join(', ');
    const [result] = await pool.query(
      `INSERT INTO ${turnosTable} (${insertColumns.join(', ')}) VALUES (${placeholders})`,
      insertValues
    );

    const usuario = req.headers['x-user-usuario'] || 'desconocido';
    writeLog(usuario, 'TURNO_CREADO', `fecha=${fecha} hora=${hora} servicio=${servicioId}`);

    return res.status(201).json({
      message: 'Turno registrado correctamente.',
      turno: { id: result.insertId, fecha, hora, usuarioId, servicioId }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al registrar turno.', detail: error.message });
  }
});

app.get('/api/pagos', async (_req, res) => {
  try {
    const pagosTable = await findExistingTable(['pagos', 'barberia_pagos']);
    if (!pagosTable) return res.json([]);

    const pagosColumns = await getTableColumns(pagosTable);
    const serviciosTable = await findExistingTable(['servicios', 'barberia_servicios']);
    const tiposPagoTable = await findExistingTable(['tipos_pagos', 'barberia_tipos_pagos']);
    const tiposServiciosTable = await findExistingTable(['tipos_servicios', 'barberia_tipos_servicios']);

    const montoSelect = pagosColumns.includes('pag_monto') ? 'p.pag_monto' : 'NULL';
    const fechaSelect = pagosColumns.includes('pag_fecha') ? 'p.pag_fecha' : 'NULL';
    const descuentoSelect = pagosColumns.includes('pag_descuento') ? 'p.pag_descuento' : '0';
    const montoFinalSelect = pagosColumns.includes('pag_monto_final') ? 'p.pag_monto_final' : 'NULL';
    const serJoin = serviciosTable ? `LEFT JOIN ${serviciosTable} s ON s.ser_id = p.ser_id` : '';
    const tservJoin = serviciosTable && tiposServiciosTable ? `LEFT JOIN ${tiposServiciosTable} ts ON ts.tips_id = s.tips_id` : '';
    const tippJoin = tiposPagoTable ? `LEFT JOIN ${tiposPagoTable} tp ON tp.tipp_id = p.tipp_id` : '';
    const servicioSelect = serviciosTable && tiposServiciosTable ? 'ts.tips_nombre_servicio' : 'NULL';
    const metodoSelect = tiposPagoTable ? 'tp.tipp_tipo_pago' : 'NULL';

    const [rows] = await pool.query(
      `SELECT p.pag_id AS id, ${servicioSelect} AS servicio, ${metodoSelect} AS metodo,
              ${montoSelect} AS monto, ${descuentoSelect} AS descuento, ${montoFinalSelect} AS monto_final, ${fechaSelect} AS fecha
       FROM ${pagosTable} p ${serJoin} ${tservJoin} ${tippJoin}
       ORDER BY p.pag_id DESC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar pagos.', detail: error.message });
  }
});

// Guardar pago simulado
app.post('/api/pagos', async (req, res) => {
  try {
    const pagosTable = await findExistingTable(['pagos', 'barberia_pagos']);
    const tiposPagoTable = await findExistingTable(['tipos_pagos', 'barberia_tipos_pagos']);
    if (!pagosTable) return res.status(404).json({ message: 'No existe la tabla de pagos.' });

    const { metodoPago, monto, servicioId } = req.body;
    let tippId = null;
    if (tiposPagoTable && metodoPago) {
      const [tp] = await pool.query(
        `SELECT tipp_id FROM ${tiposPagoTable} WHERE tipp_tipo_pago = ? LIMIT 1`, [metodoPago]
      );
      if (tp.length > 0) tippId = tp[0].tipp_id;
    }

    const descuento = req.body.descuento || 0;
    const montoFinal = monto - (monto * descuento / 100);
    await pool.query(
      `INSERT INTO ${pagosTable} (ser_id, tipp_id, pag_monto, pag_descuento, pag_monto_final, pag_fecha) VALUES (?, ?, ?, ?, ?, CURDATE())`,
      [servicioId || null, tippId, monto || 0, descuento, montoFinal]
    );

    const usuario = req.headers['x-user-usuario'] || 'cliente';
    writeLog(usuario, 'PAGO_REGISTRADO', `metodo=${metodoPago} monto=${monto}`);
    return res.status(201).json({ message: 'Pago registrado correctamente.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al registrar pago.', detail: error.message });
  }
});

// RNF5: backup desde el panel admin
app.post('/api/backup', requireRole('admin'), async (req, res) => {
  const { execSync } = require('child_process');
  const BACKUP_DIR = path.join(__dirname, 'backups');
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

  const fecha = new Date().toISOString().slice(0, 10);
  const archivo = path.join(BACKUP_DIR, `barberia_backup_${fecha}.sql`);
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'barberia';

  try {
    const passFlag = dbPass ? `-p${dbPass}` : '';
    const mysqldumpPath = process.env.MYSQLDUMP_PATH || 'mysqldump';
    execSync(`"${mysqldumpPath}" -h ${dbHost} -u ${dbUser} ${passFlag} ${dbName} > "${archivo}"`);
    const usuario = req.headers['x-user-usuario'] || 'admin';
    writeLog(usuario, 'BACKUP_CREADO', archivo);
    return res.json({ message: `Backup creado: ${path.basename(archivo)}` });
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear backup. Verifica que mysqldump esté en el PATH.', detail: error.message });
  }
});


// Calcular descuento según turnos históricos del usuario
app.get('/api/descuento/:usu_id', async (req, res) => {
  try {
    const { usu_id } = req.params;
    const turnosTable = await findExistingTable(['turnos', 'barberia_turnos']);
    if (!turnosTable) return res.json({ descuento: 0, totalTurnos: 0 });

    const [rows] = await pool.query(
      `SELECT COUNT(*) as total FROM ${turnosTable} WHERE usu_id = ?`,
      [usu_id]
    );
    const totalTurnos = rows[0].total;
    const descuento = totalTurnos >= 3 ? 10 : 0;
    return res.json({ descuento, totalTurnos });
  } catch (error) {
    return res.status(500).json({ message: 'Error al calcular descuento.', detail: error.message });
  }
});

ensureTables()
  .then(() => {
    app.listen(apiPort, () => {
      console.log(`API escuchando en http://localhost:${apiPort}`);
    });
  })
  .catch((error) => {
    console.error('No se pudo iniciar API:', error.message);
    process.exit(1);
  });