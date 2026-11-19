// CU09 — Jugar una misión (HU-11 misión corta · HU-12 retomar · HU-14 saber de inmediato si acerté
// · HU-16 registrar cada respuesta) y CU11 — progreso por eje y por sesión.
// Una misión = una `sesion` con un conjunto fijo de preguntas de un eje.
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const config = require('../config');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { badRequest, conflict, forbidden, notFound } = require('../lib/errors');
const { idParam } = require('../lib/params');
const { progresoPorEje, historialMisiones } = require('../lib/progreso');
const { exigirConsentimiento } = require('../lib/consentimiento');
const kumon = require('../lib/kumon');

const router = express.Router();
router.use(requireAuth, requireRole('estudiante'));

/**
 * Nivel con que parte la misión. Por ahora es el mismo de la última misión del eje (o 1 si es la primera).
 * El ajuste según el desempeño es el CU13 (Sprint 4): se reemplaza esta función.
 */
async function nivelInicial(estudianteId, ejeId) {
  const { rows } = await db.query(
    `SELECT dificultad_inicial FROM sesion WHERE estudiante_id = $1 AND eje_id = $2
     ORDER BY iniciada_en DESC LIMIT 1`,
    [estudianteId, ejeId],
  );
  return rows[0]?.dificultad_inicial ?? 1;
}

// Lo que ve el niño de una pregunta: nunca la respuesta correcta ni los tipos de error.
const preguntaParaJugar = (p) => ({
  id: Number(p.id),
  enunciado: p.enunciado,
  opciones: p.opciones.map((o) => ({ clave: o.clave, texto: o.texto })),
});

async function resumen(sesionId) {
  const { rows } = await db.query(
    `SELECT COUNT(r.id)::int AS respondidas,
            COUNT(r.id) FILTER (WHERE r.es_correcta)::int AS correctas,
            cardinality(s.pregunta_ids) AS total,
            EXTRACT(EPOCH FROM (COALESCE(s.terminada_en, now()) - s.iniciada_en))::int AS duracion_seg
     FROM sesion s LEFT JOIN respuesta r ON r.sesion_id = s.id
     WHERE s.id = $1 GROUP BY s.id`,
    [sesionId],
  );
  const r = rows[0];
  return { total: r.total, respondidas: r.respondidas, correctas: r.correctas, duracionSeg: r.duracion_seg };
}

async function buscarMision(req) {
  const { rows } = await db.query(
    `SELECT s.id, s.eje_id, s.pregunta_ids, s.iniciada_en, s.terminada_en, s.abandonada_en, s.dificultad_inicial,
            e.codigo AS eje_codigo, e.nombre AS eje_nombre, e.isla_nombre
     FROM sesion s JOIN eje e ON e.id = s.eje_id
     WHERE s.id = $1 AND s.estudiante_id = $2`,
    [idParam(req), req.user.id],
  );
  if (!rows[0]) throw notFound('Misión no encontrada');
  return rows[0];
}

const ejePublico = (m) => ({ id: m.eje_id, codigo: m.eje_codigo, nombre: m.eje_nombre, isla: m.isla_nombre });

const estadoDe = (m) => (m.terminada_en ? 'terminada' : m.abandonada_en ? 'abandonada' : 'abierta');

/** Misión completa tal como la ve el niño: preguntas en orden, cuáles respondió y, si terminó, el resumen. */
async function misionParaJugar(m) {
  const { rows: preguntas } = await db.query(
    'SELECT id, enunciado, opciones FROM pregunta WHERE id = ANY($1)', [m.pregunta_ids]);
  const porId = new Map(preguntas.map((p) => [String(p.id), p]));
  const { rows: respondidas } = await db.query(
    'SELECT pregunta_id, es_correcta FROM respuesta WHERE sesion_id = $1 ORDER BY respondida_en, id', [m.id]);
  return {
    id: Number(m.id),
    eje: ejePublico(m),
    iniciadaEn: m.iniciada_en,
    estado: estadoDe(m),
    terminada: Boolean(m.terminada_en),
    total: m.pregunta_ids.length,
    preguntas: m.pregunta_ids.map((id) => preguntaParaJugar(porId.get(String(id)))),
    respondidas: respondidas.map((r) => ({ preguntaId: Number(r.pregunta_id), correcta: r.es_correcta })),
    resumen: m.terminada_en ? await resumen(m.id) : null,
  };
}

/** Deja como abandonadas las misiones abiertas del estudiante en un eje (opcionalmente, salvo una). */
async function abandonarAbiertas(estudianteId, ejeId, exceptoId = null) {
  await db.query(
    `UPDATE sesion SET abandonada_en = now()
     WHERE estudiante_id = $1 AND eje_id = $2 AND terminada_en IS NULL AND abandonada_en IS NULL
       AND ($3::bigint IS NULL OR id <> $3)`,
    [estudianteId, ejeId, exceptoId],
  );
}

// HU-11 — Iniciar una misión en un eje (isla)
router.post('/misiones', validate(z.object({ ejeId: z.number().int().positive() })), async (req, res) => {
  const estudianteId = req.user.id;
  await exigirConsentimiento(estudianteId);
  const { rows: ejes } = await db.query('SELECT id, codigo, nombre, isla_nombre FROM eje WHERE id = $1', [req.body.ejeId]);
  const eje = ejes[0];
  if (!eje) throw notFound('Esa isla no existe', 'EJE_NO_ENCONTRADO');

  // Empezar una misión nueva deja abandonada la que estaba a medias en esa isla (HU-12):
  // a lo más hay una misión abierta por eje.
  await abandonarAbiertas(estudianteId, eje.id);
  const nivel = await nivelInicial(estudianteId, eje.id);
  // Elige primero las preguntas que el niño ha visto menos, luego las más cercanas a su nivel, y al azar entre iguales.
  const { rows: elegidas } = await db.query(
    `SELECT p.id, p.enunciado, p.opciones, p.dificultad
     FROM pregunta p
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS n FROM respuesta r JOIN sesion s ON s.id = r.sesion_id
       WHERE s.estudiante_id = $1 AND r.pregunta_id = p.id
     ) vistas ON TRUE
     WHERE p.eje_id = $2 AND p.activa AND (p.revisada_pedagogicamente OR NOT $5)
     ORDER BY vistas.n, abs(p.dificultad - $3), random()
     LIMIT $4`,
    [estudianteId, eje.id, nivel, config.mision.preguntas, config.mision.soloRevisadas],
  );
  if (!elegidas.length) {
    throw conflict('Esta isla todavía no tiene misiones. ¡Prueba con otra!', 'SIN_PREGUNTAS');
  }
  // De la más fácil a la más difícil: la misión parte con confianza.
  elegidas.sort((a, b) => a.dificultad - b.dificultad);

  const { rows } = await db.query(
    `INSERT INTO sesion (estudiante_id, eje_id, dificultad_inicial, pregunta_ids)
     VALUES ($1, $2, $3, $4) RETURNING id, iniciada_en`,
    [estudianteId, eje.id, nivel, elegidas.map((p) => p.id)],
  );
  res.status(201).json({
    mision: {
      id: Number(rows[0].id),
      eje: { id: eje.id, codigo: eje.codigo, nombre: eje.nombre, isla: eje.isla_nombre },
      iniciadaEn: rows[0].iniciada_en,
      total: elegidas.length,
      preguntas: elegidas.map(preguntaParaJugar),
    },
  });
});

// HU-12 — ¿Hay una misión a medias en esta isla? Solo cuenta si el niño ya respondió al menos una
// pregunta y la empezó hace menos de `horasParaRetomar` (si no, se da por abandonada y parte de cero).
router.get('/misiones/abierta', async (req, res) => {
  const ejeId = Number(req.query.ejeId);
  if (!Number.isSafeInteger(ejeId) || ejeId <= 0) throw badRequest('Falta ejeId', 'VALIDACION');
  const { rows } = await db.query(
    `SELECT s.id, s.eje_id, s.pregunta_ids, s.iniciada_en, s.terminada_en, s.abandonada_en, s.dificultad_inicial,
            e.codigo AS eje_codigo, e.nombre AS eje_nombre, e.isla_nombre
     FROM sesion s JOIN eje e ON e.id = s.eje_id
     WHERE s.estudiante_id = $1 AND s.eje_id = $2 AND s.terminada_en IS NULL AND s.abandonada_en IS NULL
       AND s.iniciada_en > now() - make_interval(hours => $3)
       AND EXISTS (SELECT 1 FROM respuesta r WHERE r.sesion_id = s.id)
     ORDER BY s.iniciada_en DESC LIMIT 1`,
    [req.user.id, ejeId, config.mision.horasParaRetomar],
  );
  res.json({ mision: rows[0] ? await misionParaJugar(rows[0]) : null });
});

// Estado de una misión: preguntas, cuáles ya respondió y, si terminó, el resumen.
router.get('/misiones/:id', async (req, res) => {
  res.json({ mision: await misionParaJugar(await buscarMision(req)) });
});

// HU-12 — El niño elige «empezar de nuevo»: la misión a medias queda abandonada (sus respuestas se conservan).
router.post('/misiones/:id/abandonar', async (req, res) => {
  const m = await buscarMision(req);
  if (m.terminada_en) throw conflict('Esta misión ya terminó', 'MISION_TERMINADA');
  await db.query('UPDATE sesion SET abandonada_en = COALESCE(abandonada_en, now()) WHERE id = $1', [m.id]);
  res.status(204).end();
});

// HU-14 / HU-16 — Responder una pregunta: valida, registra y devuelve el resultado con su explicación.
const respuestaSchema = z.object({
  preguntaId: z.number().int().positive(),
  opcion: z.string().trim().toUpperCase().pipe(z.enum(['A', 'B', 'C', 'D'])),
  // Tiempo que el niño tardó en responder. Se acota a 10 min: más que eso es que dejó la app abierta.
  tiempoMs: z.number().int().min(0).transform((t) => Math.min(t, 600000)).optional(),
});

router.post('/misiones/:id/respuestas', validate(respuestaSchema), async (req, res) => {
  const m = await buscarMision(req);
  if (m.terminada_en) throw conflict('Esta misión ya terminó', 'MISION_TERMINADA');
  if (m.abandonada_en) throw conflict('Esta misión ya no está activa. ¡Empieza una nueva!', 'MISION_ABANDONADA');
  await exigirConsentimiento(req.user.id);

  const { preguntaId, opcion, tiempoMs } = req.body;
  if (!m.pregunta_ids.map(Number).includes(preguntaId)) {
    throw badRequest('Esa pregunta no es parte de esta misión', 'PREGUNTA_NO_ES_DE_LA_MISION');
  }
  const { rows } = await db.query(
    'SELECT opciones, respuesta_correcta, explicacion FROM pregunta WHERE id = $1', [preguntaId]);
  const p = rows[0];
  const elegida = p.opciones.find((o) => o.clave === opcion);
  if (!elegida) throw badRequest('Esa opción no existe en la pregunta', 'OPCION_INVALIDA');
  const correcta = opcion === p.respuesta_correcta;

  const resultado = await db.transaction(async (client) => {
    try {
      await client.query(
        `INSERT INTO respuesta (sesion_id, pregunta_id, opcion_elegida, es_correcta, tiempo_ms, tipo_error)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [m.id, preguntaId, opcion, correcta, tiempoMs ?? null, correcta ? null : elegida.tipo_error ?? null],
      );
    } catch (err) {
      if (err.code === '23505') throw conflict('Ya respondiste esta pregunta', 'YA_RESPONDIDA');
      throw err;
    }
    const { rows: c } = await client.query('SELECT COUNT(*)::int AS n FROM respuesta WHERE sesion_id = $1', [m.id]);
    const ultima = c[0].n >= m.pregunta_ids.length;
    // Al responder la última pregunta la misión se cierra sola: queda registrada su duración (HU-11).
    if (ultima) await client.query('UPDATE sesion SET terminada_en = now() WHERE id = $1 AND terminada_en IS NULL', [m.id]);
    return { respondidas: c[0].n, ultima };
  });

  res.status(201).json({
    correcta,
    respuestaCorrecta: p.respuesta_correcta,
    explicacion: p.explicacion,
    progreso: { respondidas: resultado.respondidas, total: m.pregunta_ids.length },
    terminada: resultado.ultima,
    resumen: resultado.ultima ? await resumen(m.id) : null,
  });
});

// ═════════ Motor Kumon (2.ª revisión del cliente) ═════════
// CU10 — El camino: progresión lineal de niveles y conjuntos con su estado.
router.get('/camino', async (req, res) => {
  await require('../lib/evaluaciones').exigirDiagnostico(req.user.id);
  res.json(await kumon.camino(req.user.id));
});

// CU09 — Empezar la tanda de hoy (o retomar la que quedó abierta).
router.post('/tandas', validate(z.object({conjuntoId:z.number().int().positive().optional()}).default({})), async (req, res) => {
  await exigirConsentimiento(req.user.id);
  await require('../lib/evaluaciones').exigirDiagnostico(req.user.id);
  const { tanda, retomada } = await kumon.iniciarTanda(req.user.id,req.body?.conjuntoId ?? null);
  res.status(retomada ? 200 : 201).json({ tanda, retomada });
});

router.get('/tandas/:id', async (req, res) => {
  res.json({ tanda: await kumon.tandaParaHacer(await kumon.buscarIntento(req.user.id, idParam(req))) });
});

// Guarda la opción elegida en un ejercicio (sin decir si está bien: eso se sabe al revisar).
// v16.3: alternativa (opcion) o número escrito y confirmado por el alumno (respuesta + trazos).
const esquemaTrazos = require('../lib/reconocimiento/esquema');
const respuestaTandaSchema = z.object({
  preguntaId: z.number().int().positive(),
  opcion: z.string().trim().toUpperCase().pipe(z.enum(['A', 'B', 'C', 'D'])).optional(),
  respuesta: z.string().trim().min(1).max(20).optional(),
  trazos: z.array(esquemaTrazos.trazos).min(1).max(2).optional(),
  reconocido: z.string().max(20).optional(),
  confianza: z.number().min(0).max(1).optional(),
}).refine((b) => Boolean(b.opcion) !== Boolean(b.respuesta), { message: 'Envía una alternativa o un número escrito.' });
router.post('/tandas/:id/respuestas', validate(respuestaTandaSchema), async (req, res) => {
  await exigirConsentimiento(req.user.id);
  res.json(await kumon.responder(req.user.id, idParam(req), req.body));
});

// CU12 / CU11 / CU13 — Revisar: marca lo incorrecto; cuando todo está bien, mide y decide.
router.post('/tandas/:id/revisar', async (req, res) => {
  await exigirConsentimiento(req.user.id);
  res.json(await kumon.revisar(req.user.id, idParam(req)));
});

// ═════════ Versión anterior (islas y misiones) — fuera del MVP tras la 2.ª revisión ═════════
// CU11 — Progreso del estudiante por eje (base del mapa, CU10) y por sesión (historial de misiones).
router.get('/progreso', async (req, res) => {
  res.json({ ejes: await progresoPorEje(req.user.id) });
});

router.get('/misiones', async (req, res) => {
  res.json({ misiones: await historialMisiones(req.user.id) });
});

module.exports = router;
