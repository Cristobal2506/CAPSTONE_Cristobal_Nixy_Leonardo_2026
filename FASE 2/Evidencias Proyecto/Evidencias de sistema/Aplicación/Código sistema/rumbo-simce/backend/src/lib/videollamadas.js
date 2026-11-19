const db = require('../db');
const { badRequest, conflict, forbidden, notFound } = require('./errors');
const { exigirConsentimiento } = require('./consentimiento');
const video = require('./videoProvider');
const kumon = require('./kumon');

const MOTIVOS = ['diagnostico', 'ayuda', 'cierre_nivel'];
const FORMATO = `v.id, v.estudiante_id, v.docente_id, v.motivo, v.conjunto_id, v.estado,
 v.creada_en, v.aceptada_en, v.finalizada_en, e.apodo AS estudiante,
 u.nombre AS docente`;
const JOIN = 'JOIN estudiante e ON e.id = v.estudiante_id JOIN usuario u ON u.id = v.docente_id';

const publico = (v) => ({
  id: Number(v.id), estudianteId: Number(v.estudiante_id), estudiante: v.estudiante,
  docente: v.docente, motivo: v.motivo, estado: v.estado,
  creadoEn: v.creada_en, aceptadaEn: v.aceptada_en, finalizadaEn: v.finalizada_en,
});

async function opciones(estudianteId) {
  const pos = await kumon.posicion(estudianteId);
  const { rows } = await db.query(
    'SELECT COUNT(*)::int AS n FROM intento WHERE estudiante_id = $1 AND terminado_en IS NOT NULL', [estudianteId]);
  // Diagnóstico no implementado pedagógicamente: esta opción solo solicita una sesión inicial.
  return {
    diagnostico: rows[0].n === 0,
    ayuda: Boolean(pos.requiere_profesor),
    cierre_nivel: Boolean(pos.cierre_nivel_pendiente),
  };
}

async function listarEstudiante(id) {
  const { rows } = await db.query(`SELECT ${FORMATO} FROM videollamada v ${JOIN}
    WHERE v.estudiante_id = $1 ORDER BY v.creada_en DESC LIMIT 20`, [id]);
  return rows.map(publico);
}
async function listarDocente(id) {
  const { rows } = await db.query(`SELECT ${FORMATO} FROM videollamada v ${JOIN}
    WHERE v.docente_id = $1 AND v.estado IN ('pendiente','aceptada') ORDER BY v.creada_en`, [id]);
  return rows.map(publico);
}

async function solicitar(estudianteId, motivo) {
  if (!MOTIVOS.includes(motivo)) throw badRequest('Motivo no válido', 'MOTIVO_INVALIDO');
  await exigirConsentimiento(estudianteId);
  const elegibles = await opciones(estudianteId);
  if (!elegibles[motivo]) throw forbidden('Todavía no está habilitada esta sesión', 'VIDEO_NO_HABILITADO');
  const { rows: docente } = await db.query(
    `SELECT c.docente_id FROM estudiante e JOIN curso c ON c.id = e.curso_id
     JOIN usuario u ON u.id = c.docente_id AND u.rol = 'docente' AND u.activo
     WHERE e.id = $1`, [estudianteId]);
  if (!docente[0]) throw conflict('Tu apoderado debe inscribirte en un curso con profesor para pedir la videollamada.', 'SIN_PROFESOR_ASIGNADO');
  const { rows: posicion } = await db.query('SELECT conjunto_id FROM estudiante_posicion WHERE estudiante_id = $1', [estudianteId]);
  const { rows: existentes } = await db.query(
    "SELECT id FROM videollamada WHERE estudiante_id = $1 AND estado IN ('pendiente','aceptada') LIMIT 1", [estudianteId]);
  if (existentes.length) throw conflict('Ya tienes una solicitud activa con tu profesor', 'VIDEO_YA_SOLICITADO');
  try {
    const { rows } = await db.query(`INSERT INTO videollamada(estudiante_id, docente_id, motivo, conjunto_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [estudianteId, docente[0].docente_id, motivo, posicion[0]?.conjunto_id ?? null]);
    return (await buscar(rows[0].id)).registro;
  } catch (err) {
    if (err.code === '23505') throw conflict('Ya tienes una solicitud activa con tu profesor', 'VIDEO_YA_SOLICITADO');
    throw err;
  }
}

async function buscar(id) {
  const { rows } = await db.query(`SELECT ${FORMATO}, v.sala_nombre, v.sala_url FROM videollamada v ${JOIN} WHERE v.id = $1`, [id]);
  if (!rows.length) throw notFound('Solicitud de videollamada no encontrada');
  return { registro: publico(rows[0]), datos: rows[0] };
}
function validarParticipante(datos, usuario) {
  if (usuario.rol === 'estudiante' && Number(datos.estudiante_id) === usuario.id) return;
  if (usuario.rol === 'docente' && Number(datos.docente_id) === usuario.id) return;
  throw notFound('Solicitud de videollamada no encontrada');
}

async function aceptar(id, docenteId) {
  // La fila se bloquea hasta completar la aceptacion: impide dos aceptaciones concurrentes.
  // LiveKit crea la sala al primer ingreso; aquí reservamos un nombre aleatorio.
  const client = await db.pool.connect();
  let sala;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM videollamada WHERE id = $1 FOR UPDATE', [id]);
    const v = rows[0];
    if (!v || Number(v.docente_id) !== docenteId) throw notFound('Solicitud no encontrada');
    if (v.estado !== 'pendiente') throw conflict('Esta solicitud ya fue atendida', 'VIDEO_ESTADO_INVALIDO');
    // Protección adicional: el docente sigue siendo el profesor asignado al curso.
    const { rowCount } = await client.query(
      'SELECT 1 FROM estudiante e JOIN curso c ON c.id = e.curso_id WHERE e.id = $1 AND c.docente_id = $2',
      [v.estudiante_id, docenteId]);
    if (!rowCount) throw forbidden('Ya no eres el profesor de este estudiante');
    await exigirConsentimiento(v.estudiante_id);
    sala = await video.crearSala();
    await client.query(`UPDATE videollamada SET estado = 'aceptada', sala_nombre = $2, sala_url = $3,
      aceptada_en = now() WHERE id = $1`, [id, sala.nombre, sala.url]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (sala) await video.eliminarSala(sala.nombre).catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return (await buscar(id)).registro;
}

async function acceso(id, usuario) {
  const { datos } = await buscar(id);
  validarParticipante(datos, usuario);
  if (datos.estado !== 'aceptada') throw conflict('El profesor todavía no ha aceptado la solicitud', 'VIDEO_NO_ACEPTADA');
  // Revocar el consentimiento impide obtener nuevos tokens. Los tokens previos
  // conservan validez hasta 10 min; no confundir con expulsión en tiempo real.
  await exigirConsentimiento(datos.estudiante_id);
  return video.enlaceDeAcceso({
    salaNombre: datos.sala_nombre,
    salaUrl: datos.sala_url,
    usuario,
  });
}

async function terminar(id, usuario, cancelar = false) {
  const { datos } = await buscar(id);
  validarParticipante(datos, usuario);
  if (cancelar && (usuario.rol !== 'estudiante' || datos.estado !== 'pendiente')) {
    throw conflict('Solo puedes cancelar una solicitud pendiente', 'VIDEO_ESTADO_INVALIDO');
  }
  if (!cancelar && datos.estado !== 'aceptada') throw conflict('La sesión no está en curso', 'VIDEO_ESTADO_INVALIDO');
  // Cierre lógico. Cada cliente debe colgar; no se revocan conexiones activas desde la API.
  if (datos.sala_nombre) await video.eliminarSala(datos.sala_nombre);
  const { rows } = await db.query(`UPDATE videollamada SET estado = $2, finalizada_en = now()
    WHERE id = $1 AND estado = $3 RETURNING id`,
    [id, cancelar ? 'cancelada' : 'finalizada', cancelar ? 'pendiente' : 'aceptada']);
  if (!rows.length) throw conflict('El estado de la sesión cambió', 'VIDEO_ESTADO_INVALIDO');
  return (await buscar(id)).registro;
}

module.exports = { opciones, listarEstudiante, listarDocente, solicitar, aceptar, acceso, terminar };
