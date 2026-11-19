// Pruebas de aceptación de la semana 4 — HU-12 retomar una misión incompleta (CU09)
// y CU11 registrar / consultar el progreso por eje y por sesión.
const { api, crearAdulto, crearEstudianteConSesion, auth } = require('./helpers');
const { pool } = require('../src/db');
const config = require('../src/config');

afterAll(() => pool.end());

let ejes;
beforeAll(async () => {
  const { rows } = await pool.query('SELECT id, codigo FROM eje ORDER BY orden');
  ejes = Object.fromEntries(rows.map((e) => [e.codigo, e.id]));
});

const iniciar = (token, ejeId) =>
  api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId }).then((r) => r.body.mision);

/** Responde la pregunta `p`: bien o mal a propósito. */
async function responder(token, misionId, p, bien = true) {
  const { rows } = await pool.query('SELECT respuesta_correcta, opciones FROM pregunta WHERE id = $1', [p.id]);
  const opcion = bien ? rows[0].respuesta_correcta : rows[0].opciones.find((o) => o.clave !== rows[0].respuesta_correcta).clave;
  return api().post(`/api/estudiante/misiones/${misionId}/respuestas`).set(auth(token)).send({ preguntaId: p.id, opcion });
}

const abierta = (token, ejeId) =>
  api().get(`/api/estudiante/misiones/abierta?ejeId=${ejeId}`).set(auth(token));

describe('HU-12 — Retomar una misión incompleta', () => {
  test('si salió a mitad de la misión, al volver se le ofrece continuar desde la pregunta siguiente', async () => {
    const { token } = await crearEstudianteConSesion();
    const m = await iniciar(token, ejes.numeros);
    expect((await abierta(token, ejes.numeros)).body.mision).toBeNull(); // sin respuestas no hay nada que retomar

    await responder(token, m.id, m.preguntas[0]);
    await responder(token, m.id, m.preguntas[1], false);

    const res = await abierta(token, ejes.numeros);
    expect(res.status).toBe(200);
    expect(res.body.mision).toMatchObject({ id: m.id, estado: 'abierta', total: m.total });
    expect(res.body.mision.preguntas.map((p) => p.id)).toEqual(m.preguntas.map((p) => p.id)); // mismo orden
    expect(res.body.mision.respondidas).toEqual([
      { preguntaId: m.preguntas[0].id, correcta: true },
      { preguntaId: m.preguntas[1].id, correcta: false },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/respuestaCorrecta|tipo_error|tipoError/);

    // Puede seguir respondiendo la misma misión
    expect((await responder(token, m.id, m.preguntas[2])).body.progreso.respondidas).toBe(3);
    // Una misión a medias de otra isla no aparece
    expect((await abierta(token, ejes.geometria)).body.mision).toBeNull();
  });

  test('empezar una misión nueva en la misma isla deja abandonada la anterior, conservando sus respuestas', async () => {
    const { token } = await crearEstudianteConSesion();
    const vieja = await iniciar(token, ejes.patrones);
    await responder(token, vieja.id, vieja.preguntas[0]);

    const nueva = await iniciar(token, ejes.patrones);
    expect(nueva.id).not.toBe(vieja.id);

    const tarde = await responder(token, vieja.id, vieja.preguntas[1]);
    expect(tarde.status).toBe(409);
    expect(tarde.body.error.code).toBe('MISION_ABANDONADA');

    const { rows } = await pool.query('SELECT abandonada_en FROM sesion WHERE id = $1', [vieja.id]);
    expect(rows[0].abandonada_en).not.toBeNull();
    const { rows: r } = await pool.query('SELECT COUNT(*)::int AS n FROM respuesta WHERE sesion_id = $1', [vieja.id]);
    expect(r[0].n).toBe(1);
  });

  test('«empezar de nuevo»: abandonar explícitamente la misión a medias', async () => {
    const { token } = await crearEstudianteConSesion();
    const m = await iniciar(token, ejes.datos);
    await responder(token, m.id, m.preguntas[0]);

    expect((await api().post(`/api/estudiante/misiones/${m.id}/abandonar`).set(auth(token))).status).toBe(204);
    expect((await abierta(token, ejes.datos)).body.mision).toBeNull();
    expect((await api().get(`/api/estudiante/misiones/${m.id}`).set(auth(token))).body.mision.estado).toBe('abandonada');
  });

  test('no se puede abandonar una misión terminada ni la de otro estudiante', async () => {
    const { token } = await crearEstudianteConSesion();
    const otro = await crearEstudianteConSesion();
    const m = await iniciar(token, ejes.medicion);
    expect((await api().post(`/api/estudiante/misiones/${m.id}/abandonar`).set(auth(otro.token))).status).toBe(404);
    for (const p of m.preguntas) await responder(token, m.id, p);
    const r = await api().post(`/api/estudiante/misiones/${m.id}/abandonar`).set(auth(token));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('MISION_TERMINADA');
  });

  test(`pasadas ${config.mision.horasParaRetomar} horas ya no se ofrece retomar`, async () => {
    const { token } = await crearEstudianteConSesion();
    const m = await iniciar(token, ejes.geometria);
    await responder(token, m.id, m.preguntas[0]);
    await pool.query(
      "UPDATE sesion SET iniciada_en = now() - make_interval(hours => $2) - interval '1 minute' WHERE id = $1",
      [m.id, config.mision.horasParaRetomar]);
    expect((await abierta(token, ejes.geometria)).body.mision).toBeNull();
  });

  test('ejeId es obligatorio', async () => {
    const { token } = await crearEstudianteConSesion();
    expect((await api().get('/api/estudiante/misiones/abierta').set(auth(token))).status).toBe(400);
  });
});

describe('CU11 — Progreso por eje y por sesión', () => {
  test('un estudiante nuevo ve las 5 islas sin avance', async () => {
    const { token } = await crearEstudianteConSesion();
    const res = await api().get('/api/estudiante/progreso').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.ejes.map((e) => e.eje.codigo)).toEqual(['numeros', 'patrones', 'geometria', 'medicion', 'datos']);
    for (const e of res.body.ejes) {
      expect(e).toMatchObject({
        misionesTerminadas: 0, respondidas: 0, correctas: 0, porcentajeAcierto: null, aciertoReciente: null, nivel: 1,
      });
    }
  });

  test('registra el avance por eje: misiones terminadas, respuestas, acierto histórico y reciente', async () => {
    const { token } = await crearEstudianteConSesion();
    // Números: una misión toda mal y otra toda bien → histórico 50%, reciente (últimas 10) = 6 bien + 4 mal = 60%
    const m1 = await iniciar(token, ejes.numeros);
    for (const p of m1.preguntas) await responder(token, m1.id, p, false);
    const m2 = await iniciar(token, ejes.numeros);
    for (const p of m2.preguntas) await responder(token, m2.id, p, true);
    // Geometría: misión a medias, 2 respuestas (1 bien)
    const m3 = await iniciar(token, ejes.geometria);
    await responder(token, m3.id, m3.preguntas[0], true);
    await responder(token, m3.id, m3.preguntas[1], false);

    const { body } = await api().get('/api/estudiante/progreso').set(auth(token));
    const por = Object.fromEntries(body.ejes.map((e) => [e.eje.codigo, e]));
    const n = config.mision.preguntas;
    expect(por.numeros).toMatchObject({
      misionesTerminadas: 2, respondidas: 2 * n, correctas: n, porcentajeAcierto: 50,
      aciertoReciente: Math.round((100 * n) / 10),
    });
    expect(por.numeros.ultimaMision).toBeTruthy();
    expect(por.geometria).toMatchObject({ misionesTerminadas: 0, respondidas: 2, correctas: 1, porcentajeAcierto: 50 });
    expect(por.datos.respondidas).toBe(0);
  });

  test('historial por sesión: misiones terminadas con fecha, duración y aciertos, la más reciente primero', async () => {
    const { token } = await crearEstudianteConSesion();
    const a = await iniciar(token, ejes.medicion);
    for (const [i, p] of a.preguntas.entries()) await responder(token, a.id, p, i < 2);
    const b = await iniciar(token, ejes.datos);
    for (const p of b.preguntas) await responder(token, b.id, p, true);
    const abiertaSinTerminar = await iniciar(token, ejes.patrones);
    await responder(token, abiertaSinTerminar.id, abiertaSinTerminar.preguntas[0]);

    const { body } = await api().get('/api/estudiante/misiones').set(auth(token));
    expect(body.misiones.map((m) => m.id)).toEqual([b.id, a.id]); // la abierta no aparece
    expect(body.misiones[1]).toMatchObject({
      eje: { codigo: 'medicion' }, total: a.total, correctas: 2, duracionSeg: expect.any(Number),
      porcentajeAcierto: Math.round((100 * 2) / a.total),
    });
  });

  test('el progreso es solo del propio estudiante y los adultos no usan esta ruta', async () => {
    const uno = await crearEstudianteConSesion();
    const otro = await crearEstudianteConSesion();
    const m = await iniciar(uno.token, ejes.numeros);
    await responder(uno.token, m.id, m.preguntas[0]);
    const { body } = await api().get('/api/estudiante/progreso').set(auth(otro.token));
    expect(body.ejes.every((e) => e.respondidas === 0)).toBe(true);
    const apo = await crearAdulto();
    expect((await api().get('/api/estudiante/progreso').set(auth(apo.token))).status).toBe(403);
  });
});
