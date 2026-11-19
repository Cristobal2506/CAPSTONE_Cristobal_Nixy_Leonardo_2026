// Pruebas de aceptación de la semana 5 — Motor Kumon (2.ª revisión del cliente)
//   CU18 secuencia de conjuntos · CU09 tanda diaria · CU12 corregir hasta dejar todo correcto
//   CU11 acierto y tiempo · CU13 avanzar / repetir / retroceder · CU10 progresión lineal
const { api, crearAdulto, crearAdmin, crearEstudianteConSesion, auth } = require('./helpers');
const { pool } = require('../src/db');
const config = require('../src/config');

afterAll(() => pool.end());

const empezar = (token) => api().post('/api/estudiante/tandas').set(auth(token));
const camino = (token) => api().get('/api/estudiante/camino').set(auth(token)).then((r) => r.body);
const ejerciciosDe = (tanda) => tanda.hojas.flatMap((h) => h.ejercicios);

async function opcionDe(preguntaId, bien) {
  const { rows } = await pool.query('SELECT respuesta_correcta, opciones FROM pregunta WHERE id = $1', [preguntaId]);
  return bien ? rows[0].respuesta_correcta : rows[0].opciones.find((o) => o.clave !== rows[0].respuesta_correcta).clave;
}
// v16.3: alternativa o número escrito, según el ejercicio.
const responder = async (token, tandaId, preguntaId, bien = true) =>
  api().post(`/api/estudiante/tandas/${tandaId}/respuestas`).set(auth(token))
    .send(await require('./helpers').cuerpoTanda(preguntaId, bien));
const revisar = (token, tandaId) => api().post(`/api/estudiante/tandas/${tandaId}/revisar`).set(auth(token));

/** Hace la tanda completa: `malas` = cuántos ejercicios responde mal en la primera vuelta (luego los corrige). */
async function hacerTanda(token, { malas = 0, segundos = null } = {}) {
  const { body } = await empezar(token);
  const t = body.tanda;
  const ejercicios = ejerciciosDe(t);
  for (const [i, e] of ejercicios.entries()) await responder(token, t.id, e.id, i >= malas);
  if (segundos !== null) {
    await pool.query("UPDATE intento SET iniciado_en = now() - make_interval(secs => $2) WHERE id = $1", [t.id, segundos]);
  }
  let r = await revisar(token, t.id);
  while (!r.body.terminado) {
    for (const id of r.body.aCorregir) await responder(token, t.id, id, true);
    r = await revisar(token, t.id);
  }
  return { tanda: t, resultado: r.body.resultado };
}

describe('CU18 — Secuencia de conjuntos de hojas (seed provisorio de Números)', () => {
  test('niveles en orden lineal, cada conjunto con hojas que parten con un ejemplo resuelto y la misma dosis', async () => {
    const { rows } = await pool.query(
      `SELECT n.codigo AS nivel, c.codigo, c.tiempo_estandar_seg, h.orden, h.ejemplo_resolucion,
              (SELECT COUNT(*) FROM hoja_ejercicio he WHERE he.hoja_id = h.id)::int AS ejercicios
       FROM nivel n JOIN conjunto c ON c.nivel_id = n.id JOIN hoja h ON h.conjunto_id = c.id
       ORDER BY n.orden, c.orden, h.orden`);
    expect([...new Set(rows.map((r) => r.nivel))]).toEqual(['NUM-N1', 'NUM-N2']);
    expect([...new Set(rows.map((r) => r.codigo))]).toHaveLength(4);
    for (const r of rows) {
      expect(r.ejemplo_resolucion.length).toBeGreaterThan(10);
      expect(r.ejercicios).toBe(3);
      expect(r.tiempo_estandar_seg).toBeGreaterThan(0);
    }
  });

  test('el MVP parte solo con Números y operaciones', async () => {
    const { rows } = await pool.query('SELECT DISTINCT e.codigo FROM nivel n JOIN eje e ON e.id = n.eje_id');
    expect(rows.map((r) => r.codigo)).toEqual(['numeros']);
  });
});

describe('CU10 — Camino (progresión lineal)', () => {
  test('un estudiante nuevo parte en el primer conjunto y el resto está bloqueado', async () => {
    const { token } = await crearEstudianteConSesion();
    const c = await camino(token);
    const conjuntos = c.niveles.flatMap((n) => n.conjuntos);
    expect(conjuntos.map((x) => x.estado)).toEqual(['actual', 'bloqueado', 'bloqueado', 'bloqueado']);
    expect(c.niveles.map((n) => n.estado)).toEqual(['actual', 'bloqueado']);
    expect(c).toMatchObject({ cierreNivelPendiente: false, requiereProfesor: false, tandaAbiertaId: null });
  });
});

describe('CU09 — Tanda diaria', () => {
  test('sin consentimiento vigente no se puede hacer la tanda', async () => {
    const { token } = await crearEstudianteConSesion({ consentimiento: false });
    const r = await empezar(token);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('SIN_CONSENTIMIENTO');
  });

  test('entrega las hojas del conjunto actual: ejemplo resuelto primero y ejercicios sin respuestas', async () => {
    const { token } = await crearEstudianteConSesion();
    const r = await empezar(token);
    expect(r.status).toBe(201);
    const t = r.body.tanda;
    expect(t).toMatchObject({ repeticion: 1, ronda: 1, total: 6, conjunto: { codigo: 'NUM-N1-C1' } });
    expect(t.tiempoEstandarSeg).toBeGreaterThan(0);
    expect(t.hojas).toHaveLength(2);
    for (const h of t.hojas) {
      expect(h.ejemplo.enunciado).toBeTruthy();
      expect(h.ejemplo.resolucion).toBeTruthy();
      expect(h.ejercicios).toHaveLength(3);
    }
    expect(JSON.stringify(t)).not.toMatch(/respuesta_correcta|respuestaCorrecta|tipo_error|tipoError|explicacion/);
  });

  test('si sale y vuelve, retoma la misma tanda con lo que ya había respondido', async () => {
    const { token } = await crearEstudianteConSesion();
    const t = (await empezar(token)).body.tanda;
    const [e1] = ejerciciosDe(t);
    const r1 = await responder(token, t.id, e1.id, false);
    expect(r1.body).toEqual({ ronda: 1, respondidas: 1, porResponder: 5 }); // no dice si está bien
    const otra = await empezar(token);
    expect(otra.status).toBe(200);
    expect(otra.body.retomada).toBe(true);
    expect(otra.body.tanda.id).toBe(t.id);
    expect(otra.body.tanda.respuestas).toEqual([{ preguntaId: e1.id, opcion: expect.any(String) }]);
  });

  test('no se puede revisar con ejercicios sin responder, ni responder ejercicios de otra tanda', async () => {
    const { token } = await crearEstudianteConSesion();
    const t = (await empezar(token)).body.tanda;
    await responder(token, t.id, ejerciciosDe(t)[0].id);
    const r = await revisar(token, t.id);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('FALTAN_RESPUESTAS');
    const { rows } = await pool.query("SELECT id FROM pregunta WHERE codigo = 'NUM-01'");
    const ajena = await api().post(`/api/estudiante/tandas/${t.id}/respuestas`).set(auth(token))
      .send({ preguntaId: Number(rows[0].id), opcion: 'A' });
    expect(ajena.body.error.code).toBe('EJERCICIO_NO_ES_DE_LA_TANDA');
    const otro = await crearEstudianteConSesion();
    expect((await revisar(otro.token, t.id)).status).toBe(404);
  });
});

describe('CU12 / CU11 — Corregir hasta dejar todo correcto, midiendo acierto y tiempo', () => {
  test('revisar marca los incorrectos sin revelar la respuesta; solo se corrigen esos', async () => {
    const { token } = await crearEstudianteConSesion();
    const t = (await empezar(token)).body.tanda;
    const ej = ejerciciosDe(t);
    for (const [i, e] of ej.entries()) await responder(token, t.id, e.id, i !== 2); // el 3.º mal
    const r = await revisar(token, t.id);
    expect(r.body).toEqual({ terminado: false, ronda: 2, aCorregir: [ej[2].id], correctas: expect.any(Array) });
    expect(JSON.stringify(r.body)).not.toMatch(/respuestaCorrecta|explicacion/);

    const yaBien = await responder(token, t.id, ej[0].id, true);
    expect(yaBien.body.error.code).toBe('EJERCICIO_YA_CORRECTO');

    await responder(token, t.id, ej[2].id, true);
    const fin = await revisar(token, t.id);
    expect(fin.body.terminado).toBe(true);
    expect(fin.body.resultado).toMatchObject({ correctasPrimeraVuelta: 5, total: 6, rondas: 2, cumpleEstandar: false });

    const { rows } = await pool.query(
      'SELECT ronda, es_correcta, tipo_error FROM intento_respuesta WHERE intento_id = $1 AND pregunta_id = $2 ORDER BY ronda',
      [t.id, ej[2].id]);
    expect(rows).toEqual([
      { ronda: 1, es_correcta: false, tipo_error: expect.any(String) },
      { ronda: 2, es_correcta: true, tipo_error: null },
    ]);
  });

  test('el tiempo se mide en el servidor, desde el inicio hasta la primera revisión', async () => {
    const { token } = await crearEstudianteConSesion();
    const { tanda, resultado } = await hacerTanda(token, { segundos: 95 });
    expect(resultado.tiempoSeg).toBeGreaterThanOrEqual(95);
    expect(resultado.tiempoSeg).toBeLessThan(110);
    const { rows } = await pool.query('SELECT tiempo_seg, correctas_primera FROM intento WHERE id = $1', [tanda.id]);
    expect(rows[0]).toEqual({ tiempo_seg: resultado.tiempoSeg, correctas_primera: 6 });
  });
});

describe('CU13 — Avanzar, repetir o retroceder según el estándar', () => {
  test('todo correcto dentro del tiempo estándar → avanza al conjunto siguiente', async () => {
    const { token } = await crearEstudianteConSesion();
    const { resultado } = await hacerTanda(token);
    expect(resultado).toMatchObject({ cumpleEstandar: true, decision: 'avanzar' });
    const c = await camino(token);
    expect(c.niveles[0].conjuntos.map((x) => x.estado)).toEqual(['dominado', 'actual']);
    expect(c.niveles[0].conjuntos[0].mejorTiempoSeg).toEqual(expect.any(Number));
  });

  test('con un error (aunque lo corrija) repite el MISMO conjunto, con los mismos ejercicios', async () => {
    const { token } = await crearEstudianteConSesion();
    const { tanda, resultado } = await hacerTanda(token, { malas: 1 });
    expect(resultado).toMatchObject({ cumpleEstandar: false, decision: 'repetir' });
    const otra = (await empezar(token)).body.tanda;
    expect(otra.id).not.toBe(tanda.id);
    expect(otra).toMatchObject({ repeticion: 2, conjunto: { codigo: tanda.conjunto.codigo } });
    expect(ejerciciosDe(otra).map((e) => e.id)).toEqual(ejerciciosDe(tanda).map((e) => e.id));
  });

  test('todo correcto pero fuera del tiempo estándar → repite', async () => {
    const { token } = await crearEstudianteConSesion();
    const { resultado } = await hacerTanda(token, { segundos: 3600 });
    expect(resultado).toMatchObject({ correctasPrimeraVuelta: 6, cumpleEstandar: false, decision: 'repetir' });
  });

  test(`con menos del ${config.kumon.umbralRetroceso * 100}% de acierto retrocede al conjunto anterior`, async () => {
    const { token } = await crearEstudianteConSesion();
    await hacerTanda(token); // domina C1, pasa a C2
    const { resultado } = await hacerTanda(token, { malas: 6 });
    expect(resultado.decision).toBe('retroceder');
    const c = await camino(token);
    expect(c.niveles[0].conjuntos.map((x) => x.estado)).toEqual(['actual', 'bloqueado']);
  });

  test('en el primer conjunto no hay a dónde retroceder: repite', async () => {
    const { token } = await crearEstudianteConSesion();
    const { resultado } = await hacerTanda(token, { malas: 6 });
    expect(resultado.decision).toBe('repetir');
  });

  test(`tras ${config.kumon.maxIntentosSinEstandar} intentos seguidos sin el estándar queda marcado para el profesor`, async () => {
    const { token } = await crearEstudianteConSesion();
    for (let i = 1; i <= config.kumon.maxIntentosSinEstandar; i++) {
      await hacerTanda(token, { malas: 1 });
      expect((await camino(token)).requiereProfesor).toBe(i === config.kumon.maxIntentosSinEstandar);
    }
    await hacerTanda(token); // lo domina: se limpia la marca
    expect((await camino(token)).requiereProfesor).toBe(false);
  });

  test('al dominar el último conjunto del nivel, el paso al siguiente espera al profesor (cierre de nivel)', async () => {
    const { token } = await crearEstudianteConSesion();
    await hacerTanda(token);
    await hacerTanda(token);
    const c = await camino(token);
    expect(c.cierreNivelPendiente).toBe(true);
    expect(c.niveles.map((n) => n.estado)).toEqual(['dominado', 'actual']);
    const r = await empezar(token);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CIERRE_NIVEL_PENDIENTE');
  });
});

describe('CU18 — Administrar la secuencia', () => {
  test('solo el administrador la ve y la ajusta', async () => {
    const apo = await crearAdulto();
    expect((await api().get('/api/admin/secuencia').set(auth(apo.token))).status).toBe(403);
    const { token } = await crearAdmin();
    const res = await api().get('/api/admin/secuencia').set(auth(token));
    expect(res.body.niveles.map((n) => n.codigo)).toEqual(['NUM-N1', 'NUM-N2']);
    expect(res.body.niveles[0].conjuntos[0]).toMatchObject({ hojas: 2, ejercicios: 6, objetivoAprendizaje: expect.any(String) });
  });

  test('cambiar el tiempo estándar aplica a las tandas nuevas, no a las que ya empezaron', async () => {
    const { token } = await crearAdmin();
    const sec = (await api().get('/api/admin/secuencia').set(auth(token))).body;
    const c2 = sec.niveles[1].conjuntos[1]; // un conjunto que no usan otras pruebas al inicio
    const r = await api().patch(`/api/admin/conjuntos/${c2.id}`).set(auth(token)).send({ tiempoEstandarSeg: 222 });
    expect(r.body.conjunto.tiempoEstandarSeg).toBe(222);
    expect((await api().patch(`/api/admin/conjuntos/${c2.id}`).set(auth(token)).send({ tiempoEstandarSeg: 2 })).status).toBe(400);
    const detalle = await api().get(`/api/admin/conjuntos/${c2.id}`).set(auth(token));
    expect(detalle.body.conjunto.hojas[0].ejercicios[0].respuestaCorrecta).toMatch(/^[A-D]$/);
    // restaurar
    await api().patch(`/api/admin/conjuntos/${c2.id}`).set(auth(token)).send({ tiempoEstandarSeg: c2.tiempoEstandarSeg });
  });

  test('editar el ejemplo resuelto de una hoja', async () => {
    const { token } = await crearAdmin();
    const sec = (await api().get('/api/admin/secuencia').set(auth(token))).body;
    const det = (await api().get(`/api/admin/conjuntos/${sec.niveles[0].conjuntos[0].id}`).set(auth(token))).body;
    const hoja = det.conjunto.hojas[0];
    const r = await api().patch(`/api/admin/hojas/${hoja.id}`).set(auth(token)).send({ ejemploResolucion: 'Paso 1… Paso 2… Resultado.' });
    expect(r.body.hoja.ejemplo.resolucion).toBe('Paso 1… Paso 2… Resultado.');
    await api().patch(`/api/admin/hojas/${hoja.id}`).set(auth(token)).send({ ejemploResolucion: hoja.ejemplo.resolucion });
  });
});
