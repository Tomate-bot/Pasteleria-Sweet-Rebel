// Generador opcional: ejecuta la MISMA semilla SQL de cinco entidades.
// Requiere ejecutar sql/esquema.sql antes y confirmar RESET_DATABASE=SI.
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
async function main() {
  if (process.env.RESET_DATABASE !== 'SI') {
    console.error('No se modificó la base. En .env coloca RESET_DATABASE=SI para habilitar el reinicio de datos DEMO.');
    return;
  }
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'pasteleria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  });
  const sql = fs.readFileSync(path.resolve(__dirname, '../../sql/semilla_5000.sql'), 'utf8');
  await client.connect();
  try { const resultado = await client.query(sql); console.log('Semilla de 5000 por tabla ejecutada.'); }
  finally { await client.end(); }
}
main().catch(err => { console.error('Error al cargar la semilla:', err.message); process.exitCode = 1; });
