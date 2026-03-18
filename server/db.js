const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barberia',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function findExistingTable(candidates) {
  for (const table of candidates) {
    try {
      await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
      return table;
    } catch (error) {
      // Continue trying the next candidate name.
    }
  }
  return null;
}

async function getTableColumns(table) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM ${table}`);
  return rows.map((row) => row.Field);
}

module.exports = {
  pool,
  findExistingTable,
  getTableColumns,
};
