// RNF5: Script de backup automático de MySQL
// Ejecutar manualmente: node server/backup.js
// O programar con cron/tarea programada de Windows

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

const fecha = new Date().toISOString().slice(0, 10);
const archivo = path.join(BACKUP_DIR, `barberia_backup_${fecha}.sql`);

const host = process.env.DB_HOST || 'localhost';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'barberia';

try {
  const passFlag = password ? `-p${password}` : '';
  execSync(
    `mysqldump -h ${host} -u ${user} ${passFlag} ${database} > "${archivo}"`,
    { stdio: 'inherit' }
  );
  console.log(`✅ Backup creado: ${archivo}`);

  // Limpiar backups de más de 30 días
  const ahora = Date.now();
  fs.readdirSync(BACKUP_DIR).forEach((file) => {
    const filePath = path.join(BACKUP_DIR, file);
    const stat = fs.statSync(filePath);
    const diasAntiguo = (ahora - stat.mtimeMs) / (1000 * 60 * 60 * 24);
    if (diasAntiguo > 30) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Backup antiguo eliminado: ${file}`);
    }
  });
} catch (error) {
  console.error('❌ Error al crear backup:', error.message);
  process.exit(1);
}