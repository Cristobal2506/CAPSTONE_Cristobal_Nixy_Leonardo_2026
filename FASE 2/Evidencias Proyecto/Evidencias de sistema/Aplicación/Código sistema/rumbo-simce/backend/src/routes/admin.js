// CU08 — Gestionar banco de preguntas por eje (rol administrador).
// El administrador no se registra por la app: se crea por script (`npm run db:demo` crea uno de prueba).
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { badRequest, notFound } = require('../lib/errors');
const { idParam } = require('../lib/params');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const CLAVES = ['A', 'B', 'C', 'D'];
const ESTRATEGIAS = ['numerica', 'visual', 'concreta', 'verbal'];

const opcionSchema = z.object({
  clave: z.enum(CLAVES),
  texto: z.string().trim().min(1).max(200),
  tipoError: z.string().trim().max(40).nullish(),
});

const camposPregunta = {
  ejeId: z.number().int().positive(),
  enunciado: z.string().trim().min(5).max(600),
  opciones: z.array(opcionSchema).min(3).max(4),
  respuestaCorrecta: z.enum(CLAVES),
  dificultad: z.number().int().min(1).max(5),
  estrategia: z.enum(ESTRATEGIAS),
  explicacion: z.string().trim().min(5).max(1000),
  codigo: z.string().trim().min(2).max(20).toUpperCase().optional(),
  revisadaPedagogicamente: z.boolean().optional(),
  activa: z.boolean().optional(),
};

const crearSchema = z.strictObject({ ...camposPregunta, estrategia: camposPregunta.estrategia.default('numerica') });
const editarSchema = z.strictObject(camposPregunta).partial();

/**
 * Reglas de una pregunta bien formada (las que no se pueden expresar campo a campo):
 *  - las claves van en orden A, B, C(, D) sin repetirse;
 *  - la respuesta correcta es una de las opciones y no tiene tipo de error;
 *  - cada distractor declara el error típico que lo explica y ese error existe en el catálogo.
 */
async function validarPregunta(p) {
  const claves = p.opciones.map((o) => o.clave);
  if (claves.join('') !== CLAVES.slice(0, claves.length).join('')) {
    throw badRequest('Las opciones deben ir en orden A, B, C(, D) sin repetirse', 'VALIDACION');
  }
  const correcta = p.opciones.find((o) => o.clave === p.respuestaCorrecta);
  if (!correcta) throw badRequest('La respuesta correcta debe ser una de las opciones', 'VALIDACION');
  if (correcta.tipoError) throw badRequest('La opción correcta no lleva tipo de error', 'VALIDACION');

  const distractores = p.opciones.filter((o) => o.clave !== p.respuestaCorrecta);
  if (distractores.some((o) => !o.tipoError)) {
    throw badRequest('Cada opción incorrecta debe indicar su tipo de error (HU-16)', 'VALIDACION');
  }
  const textos = new Set(p.opciones.map((o) => o.texto.toLowerCase()));
  if (textos.size !== p.opciones.length) throw badRequest('Hay opciones con el mismo texto', 'VALIDACION');

  const { rows: eje } = await db.query('SELECT id FROM eje WHERE id = $1', [p.ejeId]);
  if (!eje[0]) throw badRequest('El eje no existe', 'EJE_INVALIDO');

  const tipos = [...new Set(distractores.map((o) => o.tipoError))];
  const { rows } = await db.query(
    'SELECT codigo FROM tipo_error WHERE codigo = ANY($1) AND (eje_id IS NULL OR eje_id = $2)',
    [tipos, p.ejeId],
  );
  const validos = new Set(rows.map((r) => r.codigo));
  const invalidos = tipos.filter((t) => !validos.has(t));
  if (invalidos.length) {
    throw badRequest(`Tipo de error no válido para este eje: ${invalidos.join(', ')}`, 'TIPO_ERROR_INVALIDO');
  }
}

// La base guarda las opciones con tipo_error (snake_case); la API usa camelCase.
const opcionesADb = (ops) => ops.map((o) => ({ clave: o.clave, texto: o.texto, tipo_error: o.tipoError ?? null }));

const preguntaPublica = (r) => ({
  id: Number(r.id),
  codigo: r.codigo,
  ejeId: r.eje_id,
  eje: r.eje_codigo,
  enunciado: r.enunciado,
  opciones: r.opciones.map((o) => ({ clave: o.clave, texto: o.texto, tipoError: o.tipo_error ?? null })),
  respuestaCorrecta: r.respuesta_correcta,
  dificultad: r.dificultad,
  estrategia: r.estrategia,
  explicacion: r.explicacion,
  activa: r.activa,
  revisadaPedagogicamente: r.revisada_pedagogicamente,
  ...(r.veces_respondida !== undefined && {
    vecesRespondida: r.veces_respondida,
    porcentajeAcierto: r.veces_respondida ? Math.round((100 * r.aciertos) / r.veces_respondida) : null,
  }),
});

const SELECT_PREGUNTA = `
  SELECT p.*, e.codigo AS eje_codigo,
    (SELECT COUNT(*)::int FROM respuesta r WHERE r.pregunta_id = p.id) AS veces_respondida,
    (SELECT COUNT(*)::int FROM respuesta r WHERE r.pregunta_id = p.id AND r.es_correcta) AS aciertos
  FROM pregunta p JOIN eje e ON e.id = p.eje_id`;

async function buscar(id) {
  const { rows } = await db.query(`${SELECT_PREGUNTA} WHERE p.id = $1`, [id]);
  if (!rows[0]) throw notFound('Pregunta no encontrada');
  return rows[0];
}

// Catálogo de tipos de error (para armar los distractores)
router.get('/tipos-error', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT t.codigo, t.descripcion, e.codigo AS eje FROM tipo_error t
     LEFT JOIN eje e ON e.id = t.eje_id ORDER BY e.orden NULLS FIRST, t.codigo`);
  res.json({ tiposError: rows });
});

// Cobertura del banco: cuántas preguntas hay por eje y, de las activas, cuántas por dificultad
router.get('/preguntas/resumen', async (_req, res) => {
  const { rows: ejes } = await db.query(
    `SELECT e.id, e.codigo, e.nombre, e.isla_nombre AS isla,
       COUNT(p.id) FILTER (WHERE p.activa)::int AS activas,
       COUNT(p.id) FILTER (WHERE NOT p.activa)::int AS inactivas,
       COUNT(p.id) FILTER (WHERE p.activa AND p.revisada_pedagogicamente)::int AS revisadas
     FROM eje e LEFT JOIN pregunta p ON p.eje_id = e.id
     GROUP BY e.id ORDER BY e.orden`);
  const { rows: niveles } = await db.query(
    'SELECT eje_id, dificultad, COUNT(*)::int AS n FROM pregunta WHERE activa GROUP BY 1, 2');
  res.json({
    ejes: ejes.map((e) => ({
      ...e,
      porDificultad: Object.fromEntries(niveles.filter((n) => n.eje_id === e.id).map((n) => [n.dificultad, n.n])),
    })),
  });
});

// Listar con filtros: ?eje=numeros&dificultad=2&activa=true&revisada=false
const filtrosSchema = z.object({
  eje: z.string().optional(),
  dificultad: z.coerce.number().int().min(1).max(5).optional(),
  activa: z.enum(['true', 'false']).optional(),
  revisada: z.enum(['true', 'false']).optional(),
});

router.get('/preguntas', async (req, res) => {
  const f = filtrosSchema.safeParse(req.query);
  if (!f.success) throw badRequest('Filtros inválidos', 'VALIDACION');
  const cond = [];
  const params = [];
  const add = (sql, v) => { params.push(v); cond.push(sql.replace('?', `$${params.length}`)); };
  if (f.data.eje) add('e.codigo = ?', f.data.eje);
  if (f.data.dificultad) add('p.dificultad = ?', f.data.dificultad);
  if (f.data.activa) add('p.activa = ?', f.data.activa === 'true');
  if (f.data.revisada) add('p.revisada_pedagogicamente = ?', f.data.revisada === 'true');
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const { rows } = await db.query(`${SELECT_PREGUNTA} ${where} ORDER BY e.orden, p.dificultad, p.codigo NULLS LAST, p.id`, params);
  res.json({ preguntas: rows.map(preguntaPublica) });
});

router.get('/preguntas/:id', async (req, res) => {
  res.json({ pregunta: preguntaPublica(await buscar(idParam(req))) });
});

router.post('/preguntas', validate(crearSchema), async (req, res) => {
  const p = req.body;
  await validarPregunta(p);
  try {
    const { rows } = await db.query(
      `INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia,
         explicacion, revisada_pedagogicamente, activa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [p.codigo ?? null, p.ejeId, p.enunciado, JSON.stringify(opcionesADb(p.opciones)), p.respuestaCorrecta,
        p.dificultad, p.estrategia, p.explicacion, p.revisadaPedagogicamente ?? false, p.activa ?? true],
    );
    res.status(201).json({ pregunta: preguntaPublica(await buscar(rows[0].id)) });
  } catch (err) {
    if (err.code === '23505') throw badRequest('Ya existe una pregunta con ese código', 'CODIGO_EN_USO');
    throw err;
  }
});

// Editar: se combinan los cambios con la pregunta actual y se valida el resultado completo.
// Si cambia el contenido (enunciado, opciones, respuesta o explicación), vuelve a quedar
// pendiente de revisión pedagógica, salvo que en el mismo cambio se marque como revisada.
const CAMPOS_CONTENIDO = ['enunciado', 'opciones', 'respuestaCorrecta', 'explicacion'];

router.patch('/preguntas/:id', validate(editarSchema), async (req, res) => {
  const actual = preguntaPublica(await buscar(idParam(req)));
  const cambios = req.body;
  const nueva = { ...actual, ...cambios };
  await validarPregunta(nueva);
  const tocaContenido = CAMPOS_CONTENIDO.some((c) => c in cambios);
  const revisada = cambios.revisadaPedagogicamente ?? (tocaContenido ? false : actual.revisadaPedagogicamente);
  try {
    await db.query(
      `UPDATE pregunta SET codigo = $2, eje_id = $3, enunciado = $4, opciones = $5, respuesta_correcta = $6,
         dificultad = $7, estrategia = $8, explicacion = $9, revisada_pedagogicamente = $10, activa = $11,
         actualizado_en = now()
       WHERE id = $1`,
      [actual.id, nueva.codigo ?? null, nueva.ejeId, nueva.enunciado, JSON.stringify(opcionesADb(nueva.opciones)),
        nueva.respuestaCorrecta, nueva.dificultad, nueva.estrategia, nueva.explicacion, revisada, nueva.activa],
    );
  } catch (err) {
    if (err.code === '23505') throw badRequest('Ya existe una pregunta con ese código', 'CODIGO_EN_USO');
    throw err;
  }
  res.json({ pregunta: preguntaPublica(await buscar(actual.id)) });
});

// "Eliminar" = desactivar: las respuestas ya registradas apuntan a la pregunta (trazabilidad, HU-16).
router.delete('/preguntas/:id', async (req, res) => {
  const { rowCount } = await db.query(
    'UPDATE pregunta SET activa = FALSE, actualizado_en = now() WHERE id = $1', [idParam(req)]);
  if (!rowCount) throw notFound('Pregunta no encontrada');
  res.status(204).end();
});

// ═════════ CU18 — Secuencia Kumon de conjuntos de hojas ═════════
// Vista completa de la secuencia (con respuestas correctas: es para el administrador).
router.get('/secuencia', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT n.id AS nivel_id, n.codigo AS nivel_codigo, n.nombre AS nivel_nombre,
            c.id, c.codigo, c.titulo, c.objetivo_aprendizaje, c.tiempo_estandar_seg, c.activo, c.orden,
            (SELECT COUNT(*) FROM hoja h WHERE h.conjunto_id = c.id)::int AS hojas,
            (SELECT COUNT(*) FROM hoja h JOIN hoja_ejercicio he ON he.hoja_id = h.id WHERE h.conjunto_id = c.id)::int AS ejercicios,
            (SELECT COUNT(*) FROM intento i WHERE i.conjunto_id = c.id AND i.terminado_en IS NOT NULL)::int AS intentos,
            (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE i.cumple_estandar) / NULLIF(COUNT(*), 0))::int
               FROM intento i WHERE i.conjunto_id = c.id AND i.terminado_en IS NOT NULL) AS porcentaje_cumple
     FROM nivel n JOIN conjunto c ON c.nivel_id = n.id WHERE c.activo ORDER BY n.orden, c.orden`);
  const niveles = [];
  for (const r of rows) {
    let n = niveles.find((x) => x.id === r.nivel_id);
    if (!n) { n = { id: r.nivel_id, codigo: r.nivel_codigo, nombre: r.nivel_nombre, conjuntos: [] }; niveles.push(n); }
    n.conjuntos.push({
      id: r.id, codigo: r.codigo, titulo: r.titulo, objetivoAprendizaje: r.objetivo_aprendizaje,
      tiempoEstandarSeg: r.tiempo_estandar_seg, activo: r.activo, hojas: r.hojas, ejercicios: r.ejercicios,
      intentos: r.intentos, porcentajeCumpleEstandar: r.porcentaje_cumple,
    });
  }
  res.json({ niveles });
});

router.get('/conjuntos/:id', async (req, res) => {
  const id = idParam(req);
  const { rows } = await db.query('SELECT * FROM conjunto WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Conjunto no encontrado');
  const { rows: hojas } = await db.query(
    `SELECT h.id, h.orden, h.ejemplo_enunciado, h.ejemplo_resolucion,
            COALESCE(json_agg(json_build_object('id', p.id, 'codigo', p.codigo, 'enunciado', p.enunciado,
              'respuestaCorrecta', p.respuesta_correcta) ORDER BY he.orden) FILTER (WHERE p.id IS NOT NULL), '[]') AS ejercicios
     FROM hoja h LEFT JOIN hoja_ejercicio he ON he.hoja_id = h.id LEFT JOIN pregunta p ON p.id = he.pregunta_id
     WHERE h.conjunto_id = $1 GROUP BY h.id ORDER BY h.orden`, [id]);
  const c = rows[0];
  res.json({
    conjunto: {
      id: c.id, codigo: c.codigo, titulo: c.titulo, objetivoAprendizaje: c.objetivo_aprendizaje,
      tiempoEstandarSeg: c.tiempo_estandar_seg, activo: c.activo,
      hojas: hojas.map((h) => ({
        id: h.id, orden: h.orden, ejemplo: { enunciado: h.ejemplo_enunciado, resolucion: h.ejemplo_resolucion },
        ejercicios: h.ejercicios.map((e) => ({ ...e, id: Number(e.id) })),
      })),
    },
  });
});

// Ajustar el conjunto: el tiempo estándar lo fija el profesor Kumon. Los intentos ya empezados conservan el anterior.
router.patch('/conjuntos/:id', validate(z.strictObject({
  titulo: z.string().trim().min(3).max(120).optional(),
  objetivoAprendizaje: z.string().trim().min(3).max(200).optional(),
  tiempoEstandarSeg: z.number().int().min(10).max(3600).optional(),
  activo: z.boolean().optional(),
})), async (req, res) => {
  const b = req.body;
  const { rows } = await db.query(
    `UPDATE conjunto SET titulo = COALESCE($2, titulo), objetivo_aprendizaje = COALESCE($3, objetivo_aprendizaje),
       tiempo_estandar_seg = COALESCE($4, tiempo_estandar_seg), activo = COALESCE($5, activo)
     WHERE id = $1 RETURNING id, codigo, titulo, objetivo_aprendizaje, tiempo_estandar_seg, activo`,
    [idParam(req), b.titulo ?? null, b.objetivoAprendizaje ?? null, b.tiempoEstandarSeg ?? null, b.activo ?? null]);
  if (!rows[0]) throw notFound('Conjunto no encontrado');
  const c = rows[0];
  res.json({ conjunto: { id: c.id, codigo: c.codigo, titulo: c.titulo, objetivoAprendizaje: c.objetivo_aprendizaje,
    tiempoEstandarSeg: c.tiempo_estandar_seg, activo: c.activo } });
});

// Editar el ejemplo resuelto de una hoja.
router.patch('/hojas/:id', validate(z.strictObject({
  ejemploEnunciado: z.string().trim().min(2).max(600).optional(),
  ejemploResolucion: z.string().trim().min(5).max(2000).optional(),
})), async (req, res) => {
  const { rows } = await db.query(
    `UPDATE hoja SET ejemplo_enunciado = COALESCE($2, ejemplo_enunciado), ejemplo_resolucion = COALESCE($3, ejemplo_resolucion)
     WHERE id = $1 RETURNING id, ejemplo_enunciado, ejemplo_resolucion`,
    [idParam(req), req.body.ejemploEnunciado ?? null, req.body.ejemploResolucion ?? null]);
  if (!rows[0]) throw notFound('Hoja no encontrada');
  res.json({ hoja: { id: rows[0].id, ejemplo: { enunciado: rows[0].ejemplo_enunciado, resolucion: rows[0].ejemplo_resolucion } } });
});

module.exports = router;
