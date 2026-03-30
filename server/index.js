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

// ─── RNF6: Rate limiting en memoria 
const loginAttempts = {};  // { usuario: { count, blockedUntil } }
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
    const blockedUntil = new Date(Date.now() + BLOCK_MINUTES * 60 * 1000);
    info.blockedUntil = blockedUntil.toISOString();
  }
}

function clearAttempts(usuario) {
  loginAttempts[usuario] = { count: 0, blockedUntil: null };
}

// ─── RNF4: Logs de auditoría 
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

function writeLog(usuario, accion, detalle = '') {
  const fecha = new Date().toISOString();
  const linea = `[${fecha}] usuario=${usuario} accion=${accion} detalle=${detalle}\n`;
  const archivo = path.join(LOG_DIR, `auditoria_${fecha.slice(0, 10)}.log`);
  fs.appendFileSync(archivo, linea);

  // También guardar en DB
  pool.query(
    'INSERT IGNORE INTO logs_auditoria (usuario, accion, detalle, fecha) VALUES (?, ?, ?, NOW())',
    [usuario, accion, detalle]
  ).catch(() => {});
}

// ─── RNF1: Validación de contraseña 
function validarPassword(password) {
  if (!password || password.length < 5) return 'La contraseña debe tener al menos 5 caracteres.';
  return null;
}

// ─── Middleware 
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) { callback(null, true); return; }
    callback(new Error('Origen no permitido por CORS'));
  },
}));
app.use(express.json());

// ─── RNF2: Middleware de verificación de rol 
function requireRole(...roles) {
  return (req, res, next) => {
    const rolHeader = req.headers['x-user-rol'];
    if (!rolHeader || !roles.includes(rolHeader)) {
      return res.status(403).json({ message: 'Acceso denegado: rol insuficiente.' });
    }
    next();
  };
}

// ─── Tablas iniciales 
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios_app (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      rol ENUM('cliente','barbero','admin') NOT NULL DEFAULT 'cliente',
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs_auditoria (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(100) NOT NULL,
      accion VARCHAR(100) NOT NULL,
      detalle TEXT,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// ─── Health 
app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'API activa' }));

// ─── RNF1 + RNF6: Registro 
app.post('/api/auth/register', async (req, res) => {
  try {
    const { usuario, password, rol = 'cliente' } = req.body;

    if (!usuario || !password)
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });

    // RNF1: validar password
    const errorPassword = validarPassword(password);
    if (errorPassword) return res.status(400).json({ message: errorPassword });

    // RNF2: solo admin puede crear barberos/admins
    if ((rol === 'barbero' || rol === 'admin')) {
      const rolSolicitante = req.headers['x-user-rol'];
      if (rolSolicitante !== 'admin')
        return res.status(403).json({ message: 'Solo un admin puede asignar ese rol.' });
    }

    const [existing] = await pool.query('SELECT id FROM usuarios_app WHERE usuario = ? LIMIT 1', [usuario]);
    if (existing.length > 0)
      return res.status(409).json({ message: 'El usuario ya existe.' });

    // RNF3: hash seguro
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO usuarios_app (usuario, password_hash, rol) VALUES (?, ?, ?)',
      [usuario, passwordHash, rol]
    );

    writeLog(usuario, 'REGISTRO', `rol=${rol}`);
    return res.status(201).json({ message: 'Usuario registrado correctamente.', user: { id: result.insertId, usuario, rol } });
  } catch (error) {
    return res.status(500).json({ message: 'Error al registrar usuario.', detail: error.message });
  }
});

// ─── RNF1 + RNF6: Login 
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password)
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });

    // RNF6: bloqueo por intentos fallidos
    if (isBlocked(usuario)) {
      writeLog(usuario, 'LOGIN_BLOQUEADO', 'Demasiados intentos fallidos');
      return res.status(429).json({ message: `Cuenta bloqueada temporalmente (${BLOCK_MINUTES} min). Intenta más tarde.`, blocked: true });
    }

    const info = getAttemptInfo(usuario);
    const needsCaptcha = info.count >= CAPTCHA_AFTER;

    // RNF6: verificar captcha si aplica
    if (needsCaptcha && !req.body.captchaValid) {
      return res.status(400).json({ message: 'Debes completar el CAPTCHA.', needsCaptcha: true });
    }

    const [rows] = await pool.query(
      'SELECT id, usuario, password_hash, rol FROM usuarios_app WHERE usuario = ? LIMIT 1',
      [usuario]
    );

    if (rows.length === 0) {
      registerFailedAttempt(usuario);
      writeLog(usuario, 'LOGIN_FALLIDO', 'Usuario no encontrado');
      return res.status(401).json({ message: 'Credenciales inválidas.', intentosRestantes: BLOCK_AFTER - getAttemptInfo(usuario).count });
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
        needsCaptcha: getAttemptInfo(usuario).count >= CAPTCHA_AFTER,
      });
    }

    clearAttempts(usuario);
    writeLog(usuario, 'LOGIN_EXITOSO', `rol=${user.rol}`);
    return res.json({ message: 'Login correcto.', user: { id: user.id, usuario: user.usuario, rol: user.rol } });
  } catch (error) {
    return res.status(500).json({ message: 'Error al iniciar sesión.', detail: error.message });
  }
});

// ─── RNF4: Logs (solo admin)
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


app.post('/api/turnos', async (req, res) => {
  try {
    const turnosTable = await findExistingTable(['turnos', 'barberia_turnos']);
    if (!turnosTable) return res.status(404).json({ message: 'No existe la tabla de turnos.' });

    const { fecha, hora, usuarioId } = req.body;
    if (!fecha || !hora) return res.status(400).json({ message: 'Fecha y hora son requeridas.' });

    const columns = await getTableColumns(turnosTable);
    if (!columns.includes('tur_fecha') || !columns.includes('tur_hora'))
      return res.status(500).json({ message: 'La estructura de turnos no es compatible.' });

    let resolvedUserId = usuarioId ?? null;
    if (columns.includes('usu_id') && !resolvedUserId) {
      const usuariosTable = await findExistingTable(['usuarios', 'barberia_usuarios']);
      if (usuariosTable) {
        const [users] = await pool.query(`SELECT usu_id FROM ${usuariosTable} ORDER BY usu_id ASC LIMIT 1`);
        if (users.length > 0) resolvedUserId = users[0].usu_id;
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

    const usuario = req.headers['x-user-usuario'] || 'desconocido';
    writeLog(usuario, 'TURNO_CREADO', `fecha=${fecha} hora=${hora}`);

    return res.status(201).json({ message: 'Turno registrado correctamente.', turno: { id: result.insertId, fecha, hora, usuarioId: resolvedUserId } });
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
    const servicioSelect = serviciosTable && tiposServiciosTable ? 'ts.tips_nombre_servicio' : serviciosTable ? 'CONCAT("Servicio #", p.ser_id)' : 'NULL';
    const metodoSelect = tiposPagoTable ? 'tp.tipp_tipo_pago' : 'NULL';

    const [rows] = await pool.query(
      `SELECT p.pag_id AS id, ${servicioSelect} AS servicio, ${metodoSelect} AS metodo, ${montoSelect} AS monto, ${fechaSelect} AS fecha
       FROM ${pagosTable} p ${serJoin} ${tservJoin} ${tippJoin}
       ORDER BY p.pag_id DESC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar pagos.', detail: error.message });
  }
});


// ─── RNF5: Backup desde UI 
app.post("/api/backup", requireRole("admin"), async (req, res) => {
  const { execSync } = require("child_process");
  const BACKUP_DIR = path.join(__dirname, "backups");
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
  const fecha = new Date().toISOString().slice(0, 10);
  const archivo = path.join(BACKUP_DIR, `barberia_backup_${fecha}.sql`);
  const dbHost = process.env.DB_HOST || "localhost";
  const dbUser = process.env.DB_USER || "root";
  const dbPass = process.env.DB_PASSWORD || "";
  const dbName = process.env.DB_NAME || "barberia";
  try {
    const passFlag = dbPass ? `-p${dbPass}` : "";
    execSync(`mysqldump -h ${dbHost} -u ${dbUser} ${passFlag} ${dbName} > "${archivo}"`);
    const usuario = req.headers["x-user-usuario"] || "admin";
    writeLog(usuario, "BACKUP_CREADO", archivo);
    return res.json({ message: `Backup creado: ${path.basename(archivo)}` });
  } catch (error) {
    return res.status(500).json({ message: "Error al crear backup. Verifica que mysqldump este en el PATH.", detail: error.message });
  }
});

app.post("/api/servicios", requireRole("admin"), async (req, res) => {
  try {
    const { tipo, precio } = req.body;
    if (!tipo || precio === undefined)
      return res.status(400).json({ message: "Tipo y precio son requeridos." });
    const tiposServiciosTable = await findExistingTable(["tipos_servicios", "barberia_tipos_servicios"]);
    const serviciosTable = await findExistingTable(["servicios", "barberia_servicios"]);
    if (!tiposServiciosTable || !serviciosTable)
      return res.status(404).json({ message: "No se encontraron las tablas de servicios." });
    const [tipoResult] = await pool.query(
      `INSERT INTO ${tiposServiciosTable} (tips_nombre_servicio) VALUES (?)`, [tipo]
    );
    const [serResult] = await pool.query(
      `INSERT INTO ${serviciosTable} (tips_id, ser_precio) VALUES (?, ?)`, [tipoResult.insertId, precio]
    );
    const usuario = req.headers["x-user-usuario"] || "admin";
    writeLog(usuario, "SERVICIO_CREADO", `tipo=${tipo} precio=${precio}`);
    return res.status(201).json({ message: "Servicio creado correctamente.", id: serResult.insertId });
  } catch (error) {
    return res.status(500).json({ message: "Error al crear servicio.", detail: error.message });
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

