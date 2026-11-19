// Migraciones SQL simples, en orden alfabético, registradas en schema_migrations.
//   npm run db:migrate          aplica migraciones pendientes
//   npm run db:seed             migra y carga seeds (idempotentes)
//   npm run db:reset            BORRA todo el esquema public, migra y carga seeds (solo desarrollo)
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const config = require('../src/config');

async function run({ reset = false, seed = false, databaseUrl = config.databaseUrl, silent = false } = {}) {
  const log = silent ? () => {} : console.log;
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    if (reset) {
      if (config.env === 'production') throw new Error('db:reset no se permite en producción');
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      log('Esquema reiniciado');
    }
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (nombre TEXT PRIMARY KEY, aplicada_en TIMESTAMPTZ DEFAULT now())');
    const aplicadas = new Set((await client.query('SELECT nombre FROM schema_migrations')).rows.map((r) => r.nombre));

    const dir = path.join(__dirname, '..', 'migrations');
    for (const archivo of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      if (aplicadas.has(archivo)) continue;
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(dir, archivo), 'utf8'));
        await client.query('INSERT INTO schema_migrations (nombre) VALUES ($1)', [archivo]);
        await client.query('COMMIT');
        log(`✔ migración ${archivo}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falló ${archivo}: ${err.message}`);
      }
    }

    if (seed) {
      const seedDir = path.join(__dirname, '..', 'seeds');
      for (const archivo of fs.readdirSync(seedDir).filter((f) => f.endsWith('.sql')).sort()) {
        await client.query(fs.readFileSync(path.join(seedDir, archivo), 'utf8'));
        log(`✔ seed ${archivo}`);
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  run({ reset: args.includes('--reset'), seed: args.includes('--seed') }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { run };
