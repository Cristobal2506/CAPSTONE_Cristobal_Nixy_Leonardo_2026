const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();
const api = () => request(app);
let n = 0;
const emailUnico = (prefijo = 'user') => `${prefijo}.${Date.now()}.${n++}@test.cl`;

async function crearAdulto(rol = 'apoderado') {
  const email = emailUnico(rol);
  const res = await api().post('/api/auth/registro').send({ email, password: 'claveSegura1', nombre: `Test ${rol}`, rol });
  return { token: res.body.token, usuario: res.body.usuario, email };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/** El admin no se registra por la API: se inserta directo en la base, como hace `npm run db:demo`. */
async function crearAdmin() {
  const bcrypt = require('bcryptjs');
  const { pool } = require('../src/db');
  const email = emailUnico('admin');
  await pool.query("INSERT INTO usuario (email, password_hash, nombre, rol) VALUES ($1, $2, 'Admin', 'admin')",
    [email, await bcrypt.hash('claveSegura1', 4)]);
  const res = await api().post('/api/auth/login').send({ email, password: 'claveSegura1' });
  return { token: res.body.token, email };
}

/** Apoderado con consentimiento + estudiante con sesión iniciada. */
async function crearEstudianteConSesion({ consentimiento = true } = {}) {
  const apo = await crearAdulto();
  await api().post('/api/apoderado/consentimiento').set(auth(apo.token)).send({ acepta: true });
  const est = await api().post('/api/apoderado/estudiantes').set(auth(apo.token)).send({ apodo: 'Nico', pin: '2468' });
  if (!consentimiento) await api().delete('/api/apoderado/consentimiento').set(auth(apo.token));
  const login = await api().post('/api/auth/login-estudiante')
    .send({ codigo: est.body.estudiante.codigo_acceso, pin: '2468' });
  return { apo, token: login.body.token, id: est.body.estudiante.id };
}

/**
 * v16: cuerpo para PUT /evaluaciones/intentos/:id/respuesta según cómo se responde la pregunta:
 * alternativa (opcion) o número escrito (respuesta). modo: 'correcta' | 'incorrecta'.
 */
async function cuerpoRespuesta(preguntaId, modo = 'correcta') {
  const { pool } = require('../src/db');
  const { rows } = await pool.query(
    'SELECT opciones, respuesta_correcta, formato_respuesta, respuesta_numerica FROM pregunta WHERE id=$1', [preguntaId]);
  const q = rows[0], bien = modo === 'correcta';
  const { rows: ev } = await pool.query(`SELECT bool_or(e.respuesta_escrita) AS escrita FROM evaluacion_pregunta ep
    JOIN evaluacion e ON e.id = ep.evaluacion_id AND e.activa WHERE ep.pregunta_id = $1`, [preguntaId]);
  if (ev[0]?.escrita && q.formato_respuesta !== 'alternativas' && q.respuesta_numerica) {
    const mala = q.formato_respuesta === 'fraccion' ? '1/97' : '98765';
    return { preguntaId: Number(preguntaId), respuesta: bien ? q.respuesta_numerica : mala, reconocido: bien ? q.respuesta_numerica : mala, confianza: 0.95 };
  }
  const opcion = bien ? q.respuesta_correcta : q.opciones.find((o) => o.clave !== q.respuesta_correcta).clave;
  return { preguntaId: Number(preguntaId), opcion };
}

/**
 * v16.3: cuerpo para POST /estudiante/tandas/:id/respuestas. En las lecciones, un ejercicio con respuesta
 * numérica se responde escribiendo (respuesta); los demás, con alternativa (opcion).
 */
async function cuerpoTanda(preguntaId, bien = true) {
  const { pool } = require('../src/db');
  const { rows } = await pool.query(
    'SELECT opciones, respuesta_correcta, formato_respuesta, respuesta_numerica FROM pregunta WHERE id=$1', [preguntaId]);
  const q = rows[0];
  if (q.formato_respuesta !== 'alternativas' && q.respuesta_numerica) {
    const mala = q.formato_respuesta === 'fraccion' ? '1/97' : '98765';
    return { preguntaId: Number(preguntaId), respuesta: bien ? q.respuesta_numerica : mala };
  }
  return { preguntaId: Number(preguntaId), opcion: bien ? q.respuesta_correcta : q.opciones.find((o) => o.clave !== q.respuesta_correcta).clave };
}

module.exports = { api, crearAdulto, crearAdmin, crearEstudianteConSesion, auth, emailUnico, cuerpoRespuesta, cuerpoTanda };
