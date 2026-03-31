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

// RNF1: validar que la contraseña cumpla requisitos mínimos
function validarPassword(password) {
  if (!password || password.length < 5) return 'La contraseña debe tener al menos 5 caracteres.';
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
      usu_primer_apellido VARCHAR(100) NOT NULL DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

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
      tur_id INT NULL,
      FOREIGN KEY (tips_id) REFERENCES tipos_servicios(tips_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS turnos (
      tur_id INT AUTO_INCREMENT PRIMARY KEY,
      usu_id INT NULL,
      tur_fecha DATE NOT NULL,
      tur_hora TIME NOT NULL,
      FOREIGN KEY (usu_id) REFERENCES usuarios(usu_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

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
      pag_fecha DATE,
      FOREIGN KEY (ser_id) REFERENCES servicios(ser_id),
      FOREIGN KEY (tipp_id) REFERENCES tipos_pagos(tipp_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS descuentos_servicio (
      des_id INT AUTO_INCREMENT PRIMARY KEY,
      ser_id INT NOT NULL,
      des_cortes_requeridos INT NOT NULL,
      des_porcentaje DECIMAL(5,2) NOT NULL,
      des_activo TINYINT(1) NOT NULL DEFAULT 1,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_descuento_servicio (ser_id),
      FOREIGN KEY (ser_id) REFERENCES servicios(ser_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Insertar tipos de pago base si no existen
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

// RNF1 + RNF3: registro con validación de password y hash seguro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { usuario, password, rol = 'cliente' } = req.body;

    if (!usuario || !password)
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });

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

    // RNF3: hash seguro con bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // Crear entrada en tabla usuarios para poder asociar turnos
    const [usuResult] = await pool.query(
      'INSERT INTO usuarios (usu_primer_nombre, usu_primer_apellido) VALUES (?, ?)',
      [usuario, '']
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

// RNF1 + RNF6: login con bloqueo por intentos y captcha
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
    const needsCaptcha = info.count >= CAPTCHA_AFTER;

    if (needsCaptcha && !captchaValid) {
      return res.status(400).json({ message: 'Debes completar el CAPTCHA.', needsCaptcha: true });
    }

    const [rows] = await pool.query(
      'SELECT id, usuario, password_hash, rol, usu_id FROM usuarios_app WHERE usuario = ? LIMIT 1',
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
      user: { id: user.id, usuario: user.usuario, rol: user.rol, usu_id: user.usu_id }
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

app.get('/api/descuentos', async (_req, res) => {
  try {
    const descuentosTable = await findExistingTable(['descuentos_servicio']);
    if (!descuentosTable) return res.json([]);

    const serviciosTable = await findExistingTable(['servicios', 'barberia_servicios']);
    const tiposServiciosTable = await findExistingTable(['tipos_servicios', 'barberia_tipos_servicios']);

    const serJoin = serviciosTable
      ? `LEFT JOIN ${serviciosTable} s ON s.ser_id = d.ser_id`
      : '';
    const tservJoin = serviciosTable && tiposServiciosTable
      ? `LEFT JOIN ${tiposServiciosTable} ts ON ts.tips_id = s.tips_id`
      : '';
    const servicioSelect = serviciosTable && tiposServiciosTable
      ? 'ts.tips_nombre_servicio'
      : 'CONCAT("Servicio #", d.ser_id)';

    const [rows] = await pool.query(
      `SELECT d.des_id AS id,
              d.ser_id AS servicioId,
              ${servicioSelect} AS servicio,
              d.des_cortes_requeridos AS cortesRequeridos,
              d.des_porcentaje AS porcentaje,
              d.des_activo AS activo
       FROM ${descuentosTable} d ${serJoin} ${tservJoin}
       ORDER BY d.des_id DESC`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar descuentos.', detail: error.message });
  }
});

app.post('/api/descuentos', requireRole('admin'), async (req, res) => {
  try {
    const descuentosTable = await findExistingTable(['descuentos_servicio']);
    const serviciosTable = await findExistingTable(['servicios', 'barberia_servicios']);
    if (!descuentosTable || !serviciosTable)
      return res.status(404).json({ message: 'No se encontraron las tablas para descuentos.' });

    const { servicioId, cortesRequeridos, porcentaje, activo = true } = req.body;
    if (!servicioId || cortesRequeridos === undefined || porcentaje === undefined) {
      return res.status(400).json({
        message: 'Servicio, cortes requeridos y porcentaje son obligatorios.'
      });
    }

    const cortes = Number(cortesRequeridos);
    const pct = Number(porcentaje);
    if (!Number.isInteger(cortes) || cortes < 1) {
      return res.status(400).json({ message: 'Los cortes requeridos deben ser un entero mayor o igual a 1.' });
    }
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return res.status(400).json({ message: 'El porcentaje debe ser mayor a 0 y menor o igual a 100.' });
    }

    const [servicio] = await pool.query(`SELECT ser_id FROM ${serviciosTable} WHERE ser_id = ? LIMIT 1`, [servicioId]);
    if (servicio.length === 0) {
      return res.status(404).json({ message: 'El servicio indicado no existe.' });
    }

    const [result] = await pool.query(
      `INSERT INTO ${descuentosTable} (ser_id, des_cortes_requeridos, des_porcentaje, des_activo)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         des_cortes_requeridos = VALUES(des_cortes_requeridos),
         des_porcentaje = VALUES(des_porcentaje),
         des_activo = VALUES(des_activo)`,
      [Number(servicioId), cortes, pct, activo ? 1 : 0]
    );

    const usuario = req.headers['x-user-usuario'] || 'admin';
    writeLog(usuario, 'DESCUENTO_CONFIGURADO', `servicio=${servicioId} cortes=${cortes} porcentaje=${pct} activo=${activo ? 1 : 0}`);

    return res.status(201).json({
      message: 'Descuento configurado correctamente.',
      id: result.insertId || null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al guardar descuento.', detail: error.message });
  }
});

app.get('/api/servicios', async (_req, res) => {
  try {
    const serviciosTable = await findExistingTable(['servicios', 'barberia_servicios']);
    if (!serviciosTable) return res.json([]);
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

app.get('/api/turnos', async (_req, res) => {
  try {
    const turnosTable = await findExistingTable(['turnos', 'barberia_turnos']);
    if (!turnosTable) return res.json([]);
    const usuariosTable = await findExistingTable(['usuarios', 'barberia_usuarios']);
    if (!usuariosTable) {
      const [rows] = await pool.query(
        `SELECT tur_id AS id, tur_fecha AS fecha, tur_hora AS hora, usu_id AS usuarioId FROM ${turnosTable} ORDER BY tur_fecha DESC, tur_hora DESC`
      );
      return res.json(rows);
    }
    const [rows] = await pool.query(
      `SELECT t.tur_id AS id, t.tur_fecha AS fecha, t.tur_hora AS hora,
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
    if (!usuariosTable) return res.json([]);
    const [rows] = await pool.query(
      `SELECT usu_id AS id, CONCAT_WS(' ', usu_primer_nombre, usu_primer_apellido) AS nombre FROM ${usuariosTable} ORDER BY usu_id ASC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar usuarios.', detail: error.message });
  }
});

// RF8: validar que no se duplique fecha+hora y que la fecha no sea pasada
app.post('/api/turnos', async (req, res) => {
  try {
    const turnosTable = await findExistingTable(['turnos', 'barberia_turnos']);
    if (!turnosTable) return res.status(404).json({ message: 'No existe la tabla de turnos.' });

    const { fecha, hora, usuarioId } = req.body;
    if (!fecha || !hora) return res.status(400).json({ message: 'Fecha y hora son requeridas.' });

    // RF8: no permitir fechas pasadas
    const fechaTurno = new Date(`${fecha}T${hora}`);
    if (fechaTurno < new Date()) {
      return res.status(400).json({ message: 'No puedes agendar un turno en una fecha pasada.' });
    }

    // RF2: no duplicar horarios
    const [duplicado] = await pool.query(
      `SELECT tur_id FROM ${turnosTable} WHERE tur_fecha = ? AND tur_hora = ?`,
      [fecha, hora]
    );
    if (duplicado.length > 0) {
      return res.status(409).json({ message: 'Ya existe un turno para esa fecha y hora. Elige otro horario.' });
    }

    const columns = await getTableColumns(turnosTable);
    let resolvedUserId = usuarioId ?? null;

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

    const usuario = req.headers['x-user-usuario'] || 'desconocido';
    writeLog(usuario, 'TURNO_CREADO', `fecha=${fecha} hora=${hora}`);

    return res.status(201).json({
      message: 'Turno registrado correctamente.',
      turno: { id: result.insertId, fecha, hora, usuarioId: resolvedUserId }
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
    const serJoin = serviciosTable ? `LEFT JOIN ${serviciosTable} s ON s.ser_id = p.ser_id` : '';
    const tservJoin = serviciosTable && tiposServiciosTable ? `LEFT JOIN ${tiposServiciosTable} ts ON ts.tips_id = s.tips_id` : '';
    const tippJoin = tiposPagoTable ? `LEFT JOIN ${tiposPagoTable} tp ON tp.tipp_id = p.tipp_id` : '';
    const servicioSelect = serviciosTable && tiposServiciosTable
      ? 'ts.tips_nombre_servicio'
      : serviciosTable ? 'CONCAT("Servicio #", p.ser_id)' : 'NULL';
    const metodoSelect = tiposPagoTable ? 'tp.tipp_tipo_pago' : 'NULL';

    const [rows] = await pool.query(
      `SELECT p.pag_id AS id, ${servicioSelect} AS servicio, ${metodoSelect} AS metodo,
              ${montoSelect} AS monto, ${fechaSelect} AS fecha
       FROM ${pagosTable} p ${serJoin} ${tservJoin} ${tippJoin}
       ORDER BY p.pag_id DESC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar pagos.', detail: error.message });
  }
});

// RF turno: guardar pago simulado
app.post('/api/pagos', async (req, res) => {
  try {
    const pagosTable = await findExistingTable(['pagos', 'barberia_pagos']);
    const tiposPagoTable = await findExistingTable(['tipos_pagos', 'barberia_tipos_pagos']);
    const descuentosTable = await findExistingTable(['descuentos_servicio']);
    const turnosTable = await findExistingTable(['turnos', 'barberia_turnos']);
    if (!pagosTable) return res.status(404).json({ message: 'No existe la tabla de pagos.' });

    const { metodoPago, monto, turnoId, servicioId, usuarioId } = req.body;

    let tippId = null;
    if (tiposPagoTable && metodoPago) {
      const [tp] = await pool.query(
        `SELECT tipp_id FROM ${tiposPagoTable} WHERE tipp_tipo_pago = ? LIMIT 1`, [metodoPago]
      );
      if (tp.length > 0) tippId = tp[0].tipp_id;
    }

    const montoBase = Number(monto) || 0;
    let montoFinal = montoBase;
    let descuentoAplicado = 0;
    let cortesPrevios = 0;

    const resolvedServicioId = servicioId ? Number(servicioId) : null;
    let resolvedUsuarioId = usuarioId ? Number(usuarioId) : null;
    let fechaReferencia = null;
    let horaReferencia = null;

    if (turnosTable && turnoId) {
      const [turnoRows] = await pool.query(
        `SELECT usu_id, tur_fecha, tur_hora FROM ${turnosTable} WHERE tur_id = ? LIMIT 1`,
        [turnoId]
      );
      if (turnoRows.length > 0) {
        resolvedUsuarioId = resolvedUsuarioId || turnoRows[0].usu_id || null;
        fechaReferencia = turnoRows[0].tur_fecha || null;
        horaReferencia = turnoRows[0].tur_hora || null;
      }
    }

    if (descuentosTable && turnosTable && resolvedServicioId && resolvedUsuarioId) {
      const [cortesRows] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM ${turnosTable}
         WHERE usu_id = ?
           AND (
             tur_fecha < COALESCE(?, CURDATE()) OR
             (tur_fecha = COALESCE(?, CURDATE()) AND tur_hora < COALESCE(?, CURTIME()))
           )`,
        [resolvedUsuarioId, fechaReferencia, fechaReferencia, horaReferencia]
      );
      cortesPrevios = Number(cortesRows[0]?.total || 0);

      const [descuentoRows] = await pool.query(
        `SELECT des_porcentaje
         FROM ${descuentosTable}
         WHERE ser_id = ?
           AND des_activo = 1
           AND des_cortes_requeridos <= ?
         ORDER BY des_cortes_requeridos DESC
         LIMIT 1`,
        [resolvedServicioId, cortesPrevios]
      );

      if (descuentoRows.length > 0) {
        const porcentaje = Number(descuentoRows[0].des_porcentaje || 0);
        descuentoAplicado = Number(((montoBase * porcentaje) / 100).toFixed(2));
        montoFinal = Number((montoBase - descuentoAplicado).toFixed(2));
      }
    }

    await pool.query(
      `INSERT INTO ${pagosTable} (ser_id, tipp_id, pag_monto, pag_fecha) VALUES (?, ?, ?, CURDATE())`,
      [resolvedServicioId, tippId, montoFinal]
    );

    const usuario = req.headers['x-user-usuario'] || 'cliente';
    writeLog(
      usuario,
      'PAGO_REGISTRADO',
      `metodo=${metodoPago} montoBase=${montoBase} descuento=${descuentoAplicado} montoFinal=${montoFinal} turno=${turnoId} servicio=${resolvedServicioId} cortesPrevios=${cortesPrevios}`
    );

    return res.status(201).json({
      message: 'Pago registrado correctamente.',
      pago: {
        metodoPago,
        montoBase,
        descuentoAplicado,
        montoFinal,
        cortesPrevios,
      }
    });
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
    execSync(`mysqldump -h ${dbHost} -u ${dbUser} ${passFlag} ${dbName} > "${archivo}"`);
    const usuario = req.headers['x-user-usuario'] || 'admin';
    writeLog(usuario, 'BACKUP_CREADO', archivo);
    return res.json({ message: `Backup creado: ${path.basename(archivo)}` });
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear backup. Verifica que mysqldump esté en el PATH.', detail: error.message });
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