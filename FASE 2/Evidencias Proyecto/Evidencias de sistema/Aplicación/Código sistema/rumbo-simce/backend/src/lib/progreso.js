// CU11 — Progreso del estudiante por eje y por sesión (RF06).
// El progreso no se guarda aparte: se calcula desde `sesion` y `respuesta`, que ya registran
// cada misión y cada respuesta (HU-11 / HU-16). Así no hay dos fuentes de verdad.
// Está en lib/ porque lo reutilizarán los paneles del apoderado (CU16) y del docente (CU17).
const db = require('../db');

// Cuántas respuestas recientes se usan para el «acierto reciente» de cada eje.
const RESPUESTAS_RECIENTES = 10;

/** Avance por cada uno de los 5 ejes (aunque el estudiante no haya jugado en alguno). */
async function progresoPorEje(estudianteId) {
  const { rows } = await db.query(
    `WITH r AS (
       SELECT s.eje_id, r.es_correcta,
              row_number() OVER (PARTITION BY s.eje_id ORDER BY r.respondida_en DESC, r.id DESC) AS n
       FROM respuesta r JOIN sesion s ON s.id = r.sesion_id
       WHERE s.estudiante_id = $1
     ), ses AS (
       SELECT eje_id,
              COUNT(*) FILTER (WHERE terminada_en IS NOT NULL)::int AS misiones_terminadas,
              MAX(iniciada_en) AS ultima_mision
       FROM sesion WHERE estudiante_id = $1 GROUP BY eje_id
     ), nivel AS (
       SELECT DISTINCT ON (eje_id) eje_id, dificultad_inicial
       FROM sesion WHERE estudiante_id = $1 ORDER BY eje_id, iniciada_en DESC
     )
     SELECT e.id, e.codigo, e.nombre, e.isla_nombre, e.orden,
            COALESCE(ses.misiones_terminadas, 0) AS misiones_terminadas,
            ses.ultima_mision,
            COALESCE(nivel.dificultad_inicial, 1) AS nivel,
            COUNT(r.es_correcta)::int AS respondidas,
            COUNT(r.es_correcta) FILTER (WHERE r.es_correcta)::int AS correctas,
            COUNT(r.es_correcta) FILTER (WHERE r.n <= $2)::int AS recientes,
            COUNT(r.es_correcta) FILTER (WHERE r.n <= $2 AND r.es_correcta)::int AS correctas_recientes
     FROM eje e
     LEFT JOIN r ON r.eje_id = e.id
     LEFT JOIN ses ON ses.eje_id = e.id
     LEFT JOIN nivel ON nivel.eje_id = e.id
     GROUP BY e.id, ses.misiones_terminadas, ses.ultima_mision, nivel.dificultad_inicial
     ORDER BY e.orden`,
    [estudianteId, RESPUESTAS_RECIENTES],
  );
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
  return rows.map((r) => ({
    eje: { id: r.id, codigo: r.codigo, nombre: r.nombre, isla: r.isla_nombre },
    misionesTerminadas: r.misiones_terminadas,
    respondidas: r.respondidas,
    correctas: r.correctas,
    porcentajeAcierto: pct(r.correctas, r.respondidas),
    // Acierto de las últimas respuestas: muestra cómo va «ahora», no el promedio histórico.
    aciertoReciente: pct(r.correctas_recientes, r.recientes),
    nivel: r.nivel,
    ultimaMision: r.ultima_mision,
  }));
}

/** Historial de misiones terminadas (más recientes primero), con duración y aciertos. */
async function historialMisiones(estudianteId, limite = 20) {
  const { rows } = await db.query(
    `SELECT s.id, s.iniciada_en, s.terminada_en, s.dificultad_inicial,
            EXTRACT(EPOCH FROM (s.terminada_en - s.iniciada_en))::int AS duracion_seg,
            cardinality(s.pregunta_ids) AS total,
            (SELECT COUNT(*) FROM respuesta r WHERE r.sesion_id = s.id AND r.es_correcta)::int AS correctas,
            e.id AS eje_id, e.codigo, e.nombre, e.isla_nombre
     FROM sesion s JOIN eje e ON e.id = s.eje_id
     WHERE s.estudiante_id = $1 AND s.terminada_en IS NOT NULL
     ORDER BY s.terminada_en DESC LIMIT $2`,
    [estudianteId, limite],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    eje: { id: r.eje_id, codigo: r.codigo, nombre: r.nombre, isla: r.isla_nombre },
    iniciadaEn: r.iniciada_en,
    terminadaEn: r.terminada_en,
    duracionSeg: r.duracion_seg,
    nivel: r.dificultad_inicial,
    total: r.total,
    correctas: r.correctas,
    porcentajeAcierto: r.total ? Math.round((100 * r.correctas) / r.total) : null,
  }));
}

module.exports = { progresoPorEje, historialMisiones, RESPUESTAS_RECIENTES };
