

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

} catch (error) {
  console.error('❌ Error al crear backup:', error.message);
  process.exit(1);
}