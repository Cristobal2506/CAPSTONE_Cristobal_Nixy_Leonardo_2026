// Pruebas de aceptación del Sprint 2 — CU08 Banco de preguntas por eje · CU09 Jugar una misión
// (HU-11 misión corta, HU-14 saber de inmediato si acerté, HU-16 registrar cada respuesta)
// y HU-29 texto del consentimiento.
const { api, crearAdulto, crearAdmin, crearEstudianteConSesion, auth } = require('./helpers');
const { pool } = require('../src/db');
const config = require('../src/config');

afterAll(() => pool.end());

let ejes;
beforeAll(async () => {
  const { rows } = await pool.query('SELECT id, codigo FROM eje ORDER BY orden');
  ejes = Object.fromEntries(rows.map((e) => [e.codigo, e.id]));
});

const preguntaValida = (ejeId) => ({
  ejeId,
  enunciado: '¿Cuánto es 9 × 3?',
  opciones: [
    { clave: 'A', texto: '27' },
    { clave: 'B', texto: '12', tipoError: 'operacion_equivocada' },
    { clave: 'C', texto: '24', tipoError: 'tabla_multiplicar' },
  ],
  respuestaCorrecta: 'A',
  dificultad: 2,
  explicacion: '9 × 3 es sumar 9 tres veces: 9 + 9 + 9 = 27.',
});

describe('CU08 — Banco de preguntas inicial (seed)', () => {
  test('cada eje tiene preguntas activas en los niveles 1, 2 y 3', async () => {
    const { rows } = await pool.query(
      `SELECT e.codigo, array_agg(DISTINCT p.dificultad ORDER BY p.dificultad) AS niveles, COUNT(*)::int AS n
       FROM pregunta p JOIN eje e ON e.id = p.eje_id WHERE p.activa GROUP BY e.codigo`);
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      expect(r.niveles).toEqual([1, 2, 3]);
      expect(r.n).toBeGreaterThanOrEqual(config.mision.preguntas);
    }
  });

  test('todas las preguntas están bien formadas: una correcta y cada distractor con un error del catálogo', async () => {
    const { rows: preguntas } = await pool.query('SELECT codigo, eje_id, opciones, respuesta_correcta FROM pregunta');
    const { rows: tipos } = await pool.query('SELECT codigo, eje_id FROM tipo_error');
    const catalogo = new Map(tipos.map((t) => [t.codigo, t.eje_id]));
    for (const p of preguntas) {
      const claves = p.opciones.map((o) => o.clave);
      expect(claves).toEqual(['A', 'B', 'C', 'D'].slice(0, claves.length));
      const correcta = p.opciones.find((o) => o.clave === p.respuesta_correcta);
      expect(correcta).toBeDefined();
      expect(correcta.tipo_error).toBeNull();
      for (const o of p.opciones.filter((x) => x !== correcta)) {
        expect(catalogo.has(o.tipo_error)).toBe(true);
        expect([null, p.eje_id]).toContain(catalogo.get(o.tipo_error)); // error transversal o del mismo eje
      }
    }
  });

  test('el seed deja las preguntas pendientes de revisión pedagógica', async () => {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM pregunta WHERE revisada_pedagogicamente');
    expect(rows[0].n).toBe(0);
  });
});

describe('CU08 — Gestionar banco de preguntas (administrador)', () => {
  test('solo el administrador accede al banco', async () => {
    const apo = await crearAdulto();
    const docente = await crearAdulto('docente');
    const { token: tEst } = await crearEstudianteConSesion();
    expect((await api().get('/api/admin/preguntas')).status).toBe(401);
    for (const t of [apo.token, docente.token, tEst]) {
      expect((await api().get('/api/admin/preguntas').set(auth(t))).status).toBe(403);
    }
  });

  test('lista y filtra por eje y dificultad, con la respuesta correcta y los tipos de error', async () => {
    const { token } = await crearAdmin();
    const res = await api().get('/api/admin/preguntas?eje=geometria&dificultad=1').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.preguntas.length).toBeGreaterThan(0);
    for (const p of res.body.preguntas) {
      expect(p).toMatchObject({ eje: 'geometria', dificultad: 1, respuestaCorrecta: expect.any(String) });
      expect(p.opciones.some((o) => o.tipoError)).toBe(true);
    }
  });

  test('resumen de cobertura por eje y dificultad', async () => {
    const { token } = await crearAdmin();
    const res = await api().get('/api/admin/preguntas/resumen').set(auth(token));
    expect(res.body.ejes.map((e) => e.codigo)).toEqual(['numeros', 'patrones', 'geometria', 'medicion', 'datos']);
    const numeros = res.body.ejes[0];
    expect(numeros.activas).toBeGreaterThanOrEqual(6);
    expect(Object.keys(numeros.porDificultad)).toEqual(['1', '2', '3']);
  });

  test('crea una pregunta válida, que queda pendiente de revisión', async () => {
    const { token } = await crearAdmin();
    const res = await api().post('/api/admin/preguntas').set(auth(token)).send(preguntaValida(ejes.numeros));
    expect(res.status).toBe(201);
    expect(res.body.pregunta).toMatchObject({
      eje: 'numeros', respuestaCorrecta: 'A', estrategia: 'numerica', activa: true, revisadaPedagogicamente: false,
    });
    expect(res.body.pregunta.opciones[0].tipoError).toBeNull();
  });

  test.each([
    ['la respuesta correcta no está entre las opciones', { respuestaCorrecta: 'D' }, 'VALIDACION'],
    ['la correcta trae tipo de error', {
      opciones: [{ clave: 'A', texto: '27', tipoError: 'calculo' }, { clave: 'B', texto: '12', tipoError: 'calculo' },
        { clave: 'C', texto: '24', tipoError: 'calculo' }],
    }, 'VALIDACION'],
    ['un distractor no indica su error', {
      opciones: [{ clave: 'A', texto: '27' }, { clave: 'B', texto: '12' }, { clave: 'C', texto: '24', tipoError: 'calculo' }],
    }, 'VALIDACION'],
    ['claves repetidas o fuera de orden', {
      opciones: [{ clave: 'A', texto: '27' }, { clave: 'A', texto: '12', tipoError: 'calculo' },
        { clave: 'C', texto: '24', tipoError: 'calculo' }],
    }, 'VALIDACION'],
    ['error de otro eje', {
      opciones: [{ clave: 'A', texto: '27' }, { clave: 'B', texto: '12', tipoError: 'lectura_hora' },
        { clave: 'C', texto: '24', tipoError: 'calculo' }],
    }, 'TIPO_ERROR_INVALIDO'],
    ['error que no existe', {
      opciones: [{ clave: 'A', texto: '27' }, { clave: 'B', texto: '12', tipoError: 'inventado' },
        { clave: 'C', texto: '24', tipoError: 'calculo' }],
    }, 'TIPO_ERROR_INVALIDO'],
    ['dificultad fuera de rango', { dificultad: 7 }, 'VALIDACION'],
    ['menos de 3 opciones', { opciones: [{ clave: 'A', texto: '27' }, { clave: 'B', texto: '1', tipoError: 'calculo' }] }, 'VALIDACION'],
  ])('rechaza una pregunta si %s', async (_caso, cambio, code) => {
    const { token } = await crearAdmin();
    const res = await api().post('/api/admin/preguntas').set(auth(token)).send({ ...preguntaValida(ejes.numeros), ...cambio });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
  });

  test('editar el contenido la vuelve a dejar pendiente de revisión; marcarla revisada no cambia nada más', async () => {
    const { token } = await crearAdmin();
    const { body } = await api().post('/api/admin/preguntas').set(auth(token)).send(preguntaValida(ejes.numeros));
    const id = body.pregunta.id;

    const revisada = await api().patch(`/api/admin/preguntas/${id}`).set(auth(token)).send({ revisadaPedagogicamente: true });
    expect(revisada.body.pregunta).toMatchObject({ revisadaPedagogicamente: true, enunciado: '¿Cuánto es 9 × 3?' });

    const editada = await api().patch(`/api/admin/preguntas/${id}`).set(auth(token)).send({ enunciado: '¿Cuánto es 3 × 9?' });
    expect(editada.status).toBe(200);
    expect(editada.body.pregunta).toMatchObject({ enunciado: '¿Cuánto es 3 × 9?', revisadaPedagogicamente: false });

    // La edición se valida completa: no se puede dejar la respuesta correcta apuntando a una opción inexistente
    const mala = await api().patch(`/api/admin/preguntas/${id}`).set(auth(token)).send({ respuestaCorrecta: 'D' });
    expect(mala.status).toBe(400);
  });

  test('eliminar desactiva (no borra) y una pregunta inexistente responde 404', async () => {
    const { token } = await crearAdmin();
    const { body } = await api().post('/api/admin/preguntas').set(auth(token)).send(preguntaValida(ejes.numeros));
    expect((await api().delete(`/api/admin/preguntas/${body.pregunta.id}`).set(auth(token))).status).toBe(204);
    const ver = await api().get(`/api/admin/preguntas/${body.pregunta.id}`).set(auth(token));
    expect(ver.body.pregunta.activa).toBe(false);
    expect((await api().get('/api/admin/preguntas/999999').set(auth(token))).status).toBe(404);
    expect((await api().get('/api/admin/preguntas/abc').set(auth(token))).status).toBe(404);
  });
});

describe('CU09 — Jugar una misión', () => {
  const correctaDe = async (preguntaId) =>
    (await pool.query('SELECT respuesta_correcta, opciones FROM pregunta WHERE id = $1', [preguntaId])).rows[0];
  const incorrectaDe = (p) => p.opciones.find((o) => o.clave !== p.respuesta_correcta);

  test('sin consentimiento vigente del apoderado el estudiante no puede jugar', async () => {
    const { token } = await crearEstudianteConSesion({ consentimiento: false });
    const res = await api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId: ejes.numeros });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SIN_CONSENTIMIENTO');
  });

  test('solo el estudiante juega misiones', async () => {
    const docente = await crearAdulto('docente');
    const res = await api().post('/api/estudiante/misiones').set(auth(docente.token)).send({ ejeId: ejes.numeros });
    expect(res.status).toBe(403);
  });

  test('HU-11: inicia una misión corta con preguntas del eje elegido, sin revelar las respuestas', async () => {
    const { token, id } = await crearEstudianteConSesion();
    const res = await api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId: ejes.geometria });
    expect(res.status).toBe(201);
    const { mision } = res.body;
    expect(mision.total).toBe(config.mision.preguntas);
    expect(mision.eje).toMatchObject({ codigo: 'geometria', isla: expect.any(String) });
    expect(mision.preguntas).toHaveLength(mision.total);
    expect(JSON.stringify(mision)).not.toMatch(/respuesta_correcta|respuestaCorrecta|tipo_error|tipoError|explicacion/);

    const { rows } = await pool.query(
      'SELECT p.eje_id, p.dificultad FROM pregunta p WHERE id = ANY($1)', [mision.preguntas.map((p) => p.id)]);
    expect(rows.every((r) => r.eje_id === ejes.geometria)).toBe(true);

    // La sesión queda registrada con fecha de inicio y sus preguntas en orden de dificultad creciente
    const { rows: s } = await pool.query('SELECT iniciada_en, pregunta_ids FROM sesion WHERE id = $1 AND estudiante_id = $2',
      [mision.id, id]);
    expect(s[0].iniciada_en).toBeInstanceOf(Date);
    const dif = new Map((await pool.query('SELECT id, dificultad FROM pregunta WHERE id = ANY($1)', [s[0].pregunta_ids]))
      .rows.map((r) => [String(r.id), r.dificultad]));
    const orden = s[0].pregunta_ids.map((pid) => dif.get(String(pid)));
    expect(orden).toEqual([...orden].sort((a, b) => a - b));
  });

  test('HU-14 / HU-16: al responder sabe si acertó, ve la explicación y la respuesta queda registrada con su error', async () => {
    const { token } = await crearEstudianteConSesion();
    const { body } = await api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId: ejes.numeros });
    const [p1, p2] = body.mision.preguntas;

    const d1 = await correctaDe(p1.id);
    const bien = await api().post(`/api/estudiante/misiones/${body.mision.id}/respuestas`).set(auth(token))
      .send({ preguntaId: p1.id, opcion: d1.respuesta_correcta.toLowerCase(), tiempoMs: 8400 });
    expect(bien.status).toBe(201);
    expect(bien.body).toMatchObject({ correcta: true, explicacion: expect.any(String), progreso: { respondidas: 1 } });

    const d2 = await correctaDe(p2.id);
    const distractor = incorrectaDe(d2);
    const mal = await api().post(`/api/estudiante/misiones/${body.mision.id}/respuestas`).set(auth(token))
      .send({ preguntaId: p2.id, opcion: distractor.clave, tiempoMs: 12000 });
    expect(mal.body).toMatchObject({ correcta: false, respuestaCorrecta: d2.respuesta_correcta });

    const { rows } = await pool.query(
      'SELECT pregunta_id, es_correcta, tiempo_ms, tipo_error FROM respuesta WHERE sesion_id = $1 ORDER BY id', [body.mision.id]);
    expect(rows).toEqual([
      { pregunta_id: String(p1.id), es_correcta: true, tiempo_ms: 8400, tipo_error: null },
      { pregunta_id: String(p2.id), es_correcta: false, tiempo_ms: 12000, tipo_error: distractor.tipo_error },
    ]);
  });

  test('no se puede responder dos veces, ni preguntas ajenas a la misión, ni la misión de otro estudiante', async () => {
    const { token } = await crearEstudianteConSesion();
    const otro = await crearEstudianteConSesion();
    const { body } = await api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId: ejes.datos });
    const [p] = body.mision.preguntas;
    const url = `/api/estudiante/misiones/${body.mision.id}/respuestas`;

    await api().post(url).set(auth(token)).send({ preguntaId: p.id, opcion: 'A' });
    const repetida = await api().post(url).set(auth(token)).send({ preguntaId: p.id, opcion: 'B' });
    expect(repetida.status).toBe(409);
    expect(repetida.body.error.code).toBe('YA_RESPONDIDA');

    const { rows } = await pool.query('SELECT id FROM pregunta WHERE eje_id = $1 LIMIT 1', [ejes.medicion]);
    const ajena = await api().post(url).set(auth(token)).send({ preguntaId: Number(rows[0].id), opcion: 'A' });
    expect(ajena.body.error.code).toBe('PREGUNTA_NO_ES_DE_LA_MISION');

    const intruso = await api().post(url).set(auth(otro.token)).send({ preguntaId: p.id, opcion: 'A' });
    expect(intruso.status).toBe(404);
    expect((await api().get(`/api/estudiante/misiones/${body.mision.id}`).set(auth(otro.token))).status).toBe(404);
  });

  test('HU-11: al responder la última pregunta la misión se cierra con un resumen y su duración', async () => {
    const { token } = await crearEstudianteConSesion();
    const { body } = await api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId: ejes.medicion });
    const url = `/api/estudiante/misiones/${body.mision.id}/respuestas`;
    let ultima;
    let correctas = 0;
    for (const [i, p] of body.mision.preguntas.entries()) {
      const d = await correctaDe(p.id);
      const acierta = i % 2 === 0;
      if (acierta) correctas++;
      ultima = await api().post(url).set(auth(token))
        .send({ preguntaId: p.id, opcion: acierta ? d.respuesta_correcta : incorrectaDe(d).clave });
      expect(ultima.body.terminada).toBe(i === body.mision.preguntas.length - 1);
    }
    expect(ultima.body.resumen).toEqual({
      total: body.mision.total, respondidas: body.mision.total, correctas, duracionSeg: expect.any(Number),
    });
    const { rows } = await pool.query('SELECT terminada_en FROM sesion WHERE id = $1', [body.mision.id]);
    expect(rows[0].terminada_en).not.toBeNull();

    const estado = await api().get(`/api/estudiante/misiones/${body.mision.id}`).set(auth(token));
    expect(estado.body.mision).toMatchObject({ terminada: true, resumen: { correctas } });
    expect(estado.body.mision.respondidas).toHaveLength(body.mision.total);

    const tarde = await api().post(url).set(auth(token)).send({ preguntaId: body.mision.preguntas[0].id, opcion: 'A' });
    expect(tarde.body.error.code).toBe('MISION_TERMINADA');
  });

  test('la misión siguiente prioriza las preguntas que el estudiante aún no ha visto', async () => {
    const { token } = await crearEstudianteConSesion();
    const { rows } = await pool.query('SELECT id FROM pregunta WHERE eje_id = $1 AND activa', [ejes.patrones]);
    const todas = rows.map((r) => Number(r.id));
    expect(todas.length).toBeGreaterThan(config.mision.preguntas); // si no, la prueba no tiene sentido

    const m1 = (await api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId: ejes.patrones })).body.mision;
    for (const p of m1.preguntas) {
      await api().post(`/api/estudiante/misiones/${m1.id}/respuestas`).set(auth(token)).send({ preguntaId: p.id, opcion: 'A' });
    }
    const vistas = new Set(m1.preguntas.map((p) => p.id));
    const noVistas = todas.filter((id) => !vistas.has(id));

    const m2 = (await api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId: ejes.patrones })).body.mision;
    const ids2 = m2.preguntas.map((p) => p.id);
    for (const id of noVistas) expect(ids2).toContain(id);
  });

  test('isla inexistente → 404; datos inválidos → 400', async () => {
    const { token } = await crearEstudianteConSesion();
    expect((await api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId: 999 })).status).toBe(404);
    expect((await api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId: 'uno' })).status).toBe(400);
    const { body } = await api().post('/api/estudiante/misiones').set(auth(token)).send({ ejeId: ejes.numeros });
    const r = await api().post(`/api/estudiante/misiones/${body.mision.id}/respuestas`).set(auth(token))
      .send({ preguntaId: body.mision.preguntas[0].id, opcion: 'Z' });
    expect(r.status).toBe(400);
  });
});

describe('HU-29 — Texto del consentimiento', () => {
  test('el apoderado puede leer qué datos se recogen, para qué y por cuánto tiempo antes de aceptar', async () => {
    const { token } = await crearAdulto();
    const res = await api().get('/api/apoderado/consentimiento/texto').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(config.consentimientoVersion);
    const titulos = res.body.secciones.map((s) => s.titulo).join(' | ');
    expect(titulos).toMatch(/Qué datos/);
    expect(titulos).toMatch(/Para qué/);
    expect(titulos).toMatch(/Cuánto tiempo/);
  });
});
