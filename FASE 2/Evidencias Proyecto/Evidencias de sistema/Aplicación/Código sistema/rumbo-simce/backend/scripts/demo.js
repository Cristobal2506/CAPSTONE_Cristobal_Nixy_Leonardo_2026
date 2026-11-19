// Crea usuarios de prueba para probar la app en el celular (solo desarrollo).
//   npm run db:demo
// Se puede ejecutar varias veces: si ya existen, no los duplica (y les quita un bloqueo HU-04).
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const config = require('../src/config');

const DEMO = {
  apoderado: { email: 'apoderado@demo.cl', password: 'demo1234', nombre: 'Apoderado Demo' },
  docente: { email: 'docente@demo.cl', password: 'demo1234', nombre: 'Docente Demo' },
  admin: { email: 'admin@demo.cl', password: 'demo1234', nombre: 'Administrador Demo' }, // CU08
  estudiante: { apodo: 'Tomi', codigo: 'RUMB24', pin: '1234' },
  curso: { nombre: '4° Básico Demo', codigo: 'CURS4A' },
};

async function main() {
  if (config.env === 'production') throw new Error('db:demo no se permite en producción');
  const db = new Client({ connectionString: config.databaseUrl });
  await db.connect();
  try {
    await db.query('BEGIN');
    const upsertUsuario = async ({ email, password, nombre }, rol) => {
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await db.query(
        `INSERT INTO usuario (email, password_hash, nombre, rol) VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash,
           intentos_fallidos = 0, bloqueado_hasta = NULL
         RETURNING id`,
        [email, hash, nombre, rol],
      );
      return rows[0].id;
    };
    const apoderadoId = await upsertUsuario(DEMO.apoderado, 'apoderado');
    const docenteId = await upsertUsuario(DEMO.docente, 'docente');
    await upsertUsuario(DEMO.admin, 'admin');

    const { rows: cons } = await db.query(
      'SELECT 1 FROM consentimiento WHERE apoderado_id = $1 AND revocado_en IS NULL', [apoderadoId]);
    if (!cons.length) {
      await db.query('INSERT INTO consentimiento (apoderado_id, version_texto) VALUES ($1,$2)',
        [apoderadoId, config.consentimientoVersion]);
    }

    const { rows: cur } = await db.query(
      `INSERT INTO curso (docente_id, nombre, anio, codigo_union) VALUES ($1,$2,$3,$4)
       ON CONFLICT (codigo_union) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
      [docenteId, DEMO.curso.nombre, new Date().getFullYear(), DEMO.curso.codigo]);

    const pinHash = await bcrypt.hash(DEMO.estudiante.pin, 10);
    const { rows: est } = await db.query(
      `INSERT INTO estudiante (apodo, codigo_acceso, pin_hash, curso_id) VALUES ($1,$2,$3,$4)
       ON CONFLICT (codigo_acceso) DO UPDATE SET pin_hash = EXCLUDED.pin_hash,
         intentos_fallidos = 0, bloqueado_hasta = NULL RETURNING id`,
      [DEMO.estudiante.apodo, DEMO.estudiante.codigo, pinHash, cur[0].id]);
    await db.query(
      `INSERT INTO apoderado_estudiante (apoderado_id, estudiante_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`, [apoderadoId, est[0].id]);
    await db.query('COMMIT');

    console.log('\nUsuarios de prueba listos:\n');
    console.log(`  Estudiante  → código ${DEMO.estudiante.codigo}  ·  PIN ${DEMO.estudiante.pin}`);
    console.log(`  Apoderado   → ${DEMO.apoderado.email}  ·  ${DEMO.apoderado.password}`);
    console.log(`  Docente     → ${DEMO.docente.email}  ·  ${DEMO.docente.password}`);
    console.log(`  Admin       → ${DEMO.admin.email}  ·  ${DEMO.admin.password}  (banco de preguntas)`);
    console.log(`  Curso       → ${DEMO.curso.nombre} (código ${DEMO.curso.codigo})\n`);
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {
    await db.end();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
