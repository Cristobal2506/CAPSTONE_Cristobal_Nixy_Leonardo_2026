// CU03 Consentimiento · CU04 Crear estudiante y vincular · CU06 Inscribir en curso
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const config = require('../config');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { forbidden, notFound } = require('../lib/errors');
const { conCodigoUnico } = require('../lib/codigos');
const { idParam } = require('../lib/params');
const { textoConsentimiento } = require('../lib/consentimiento');

const router = express.Router();
router.use(requireAuth, requireRole('apoderado'));

async function consentimientoVigente(apoderadoId) {
  const { rows } = await db.query(
    `SELECT id, version_texto, otorgado_en FROM consentimiento
     WHERE apoderado_id = $1 AND revocado_en IS NULL ORDER BY otorgado_en DESC LIMIT 1`,
    [apoderadoId],
  );
  return rows[0] || null;
}

async function verificarVinculo(apoderadoId, estudianteId) {
  const { rowCount } = await db.query(
    'SELECT 1 FROM apoderado_estudiante WHERE apoderado_id = $1 AND estudiante_id = $2',
    [apoderadoId, estudianteId],
  );
  if (!rowCount) throw notFound('Estudiante no encontrado');
}

// CU03 — Consultar / otorgar / revocar consentimiento
router.get('/consentimiento', async (req, res) => {
  res.json({ versionVigente: config.consentimientoVersion, consentimiento: await consentimientoVigente(req.user.id) });
});

// HU-29 — Texto que el apoderado lee antes de aceptar (datos recogidos, finalidad, plazo, derechos)
router.get('/consentimiento/texto', (_req, res) => {
  const texto = textoConsentimiento(config.consentimientoVersion);
  if (!texto) throw notFound('No hay texto para la versión vigente del consentimiento', 'TEXTO_NO_DISPONIBLE');
  res.json({ version: config.consentimientoVersion, ...texto });
});

router.post('/consentimiento', validate(z.object({ acepta: z.literal(true) })), async (req, res) => {
  const actual = await consentimientoVigente(req.user.id);
  if (actual && actual.version_texto === config.consentimientoVersion) return res.json({ consentimiento: actual });
  const { rows } = await db.query(
    `INSERT INTO consentimiento (apoderado_id, version_texto) VALUES ($1, $2)
     RETURNING id, version_texto, otorgado_en`,
    [req.user.id, config.consentimientoVersion],
  );
  res.status(201).json({ consentimiento: rows[0] });
});

router.delete('/consentimiento', async (req, res) => {
  await db.query(
    'UPDATE consentimiento SET revocado_en = now() WHERE apoderado_id = $1 AND revocado_en IS NULL',
    [req.user.id],
  );
  res.status(204).end();
});

// CU04 — Crear perfil de estudiante (requiere consentimiento vigente)
const estudianteSchema = z.object({
  apodo: z.string().trim().min(2).max(40),
  avatar: z.string().max(40).optional(),
  pin: z.string().regex(/^\d{4}$/, 'el PIN son 4 dígitos'),
  parentesco: z.string().max(30).optional(),
});

router.post('/estudiantes', validate(estudianteSchema), async (req, res) => {
  if (!(await consentimientoVigente(req.user.id))) {
    throw forbidden('Debes aceptar el consentimiento de datos antes de crear un estudiante', 'SIN_CONSENTIMIENTO');
  }
  const { apodo, avatar, pin, parentesco } = req.body;
  const pinHash = await bcrypt.hash(pin, 10);

  const estudiante = await conCodigoUnico((codigo) =>
    db.transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO estudiante (apodo, avatar, codigo_acceso, pin_hash)
         VALUES ($1, COALESCE($2,'condor'), $3, $4) RETURNING id, apodo, avatar, codigo_acceso`,
        [apodo, avatar ?? null, codigo, pinHash],
      );
      await client.query(
        'INSERT INTO apoderado_estudiante (apoderado_id, estudiante_id, parentesco) VALUES ($1,$2,$3)',
        [req.user.id, rows[0].id, parentesco ?? null],
      );
      return rows[0];
    }),
  );
  res.status(201).json({ estudiante: { ...estudiante, id: Number(estudiante.id) } });
});

router.get('/estudiantes', async (req, res) => {
  const { rows } = await db.query(
    `SELECT e.id, e.apodo, e.avatar, e.codigo_acceso, c.id AS curso_id, c.nombre AS curso
     FROM apoderado_estudiante ae
     JOIN estudiante e ON e.id = ae.estudiante_id
     LEFT JOIN curso c ON c.id = e.curso_id
     WHERE ae.apoderado_id = $1 ORDER BY e.creado_en`,
    [req.user.id],
  );
  res.json({ estudiantes: rows.map((r) => ({ ...r, id: Number(r.id), curso_id: r.curso_id && Number(r.curso_id) })) });
});

// CU06 — Inscribir al estudiante en un curso con el código que entrega el docente
router.post(
  '/estudiantes/:id/curso',
  validate(z.object({ codigoCurso: z.string().trim().length(6).transform((c) => c.toUpperCase()) })),
  async (req, res) => {
    const estudianteId = idParam(req);
    await verificarVinculo(req.user.id, estudianteId);
    const { rows } = await db.query('SELECT id, nombre FROM curso WHERE codigo_union = $1', [req.body.codigoCurso]);
    if (!rows[0]) throw notFound('No existe un curso con ese código', 'CURSO_NO_ENCONTRADO');
    await db.query('UPDATE estudiante SET curso_id = $1 WHERE id = $2', [rows[0].id, estudianteId]);
    res.json({ curso: { id: Number(rows[0].id), nombre: rows[0].nombre } });
  },
);

module.exports = router;
