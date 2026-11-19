// Integración API / BD con proveedor LiveKit simulado.
// No requiere claves reales durante tests; video real en dos teléfonos.
jest.mock('../src/lib/videoProvider', () => ({
  crearSala: jest.fn(async () => ({ nombre: 'RumboSIMCEaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', url: 'wss://demo-escuela.livekit.cloud' })),
  enlaceDeAcceso: jest.fn(async ({ usuario }) => ({ url: 'wss://demo-escuela.livekit.cloud', token: `token-${usuario.rol}-${usuario.id}`, sala: 'RumboSIMCEaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', proveedor: 'livekit' })),
  eliminarSala: jest.fn(async () => {}),
}));

const { api, crearAdulto, crearEstudianteConSesion, auth } = require('./helpers');
const { pool } = require('../src/db');
const provider = require('../src/lib/videoProvider');

afterAll(() => pool.end());

async function escenario() {
  const docente = await crearAdulto('docente');
  const estudiante = await crearEstudianteConSesion();
  const curso = await api().post('/api/docente/cursos').set(auth(docente.token))
    .send({ nombre: 'Curso para videollamadas' });
  expect(curso.status).toBe(201);
  const codigo = curso.body.curso.codigo_union;
  const inscripcion = await api().post(`/api/apoderado/estudiantes/${estudiante.id}/curso`)
    .set(auth(estudiante.apo.token)).send({ codigoCurso: codigo });
  expect(inscripcion.status).toBe(200);
  return { docente, estudiante };
}

async function tandaFallida(token) {
  const inicio = await api().post('/api/estudiante/tandas').set(auth(token));
  expect([200, 201]).toContain(inicio.status);
  const t = inicio.body.tanda;
  const ejercicios = t.hojas.flatMap((h) => h.ejercicios);
  const ids = ejercicios.map((e) => e.id);
  const { rows } = await pool.query('SELECT id, respuesta_correcta, opciones FROM pregunta WHERE id = ANY($1)', [ids]);
  const porId = new Map(rows.map((r) => [Number(r.id), r]));
  for (let i = 0; i < ejercicios.length; i++) {
    // v16.3: alternativa o número escrito, según el ejercicio.
    expect((await api().post(`/api/estudiante/tandas/${t.id}/respuestas`).set(auth(token))
      .send(await require('./helpers').cuerpoTanda(ids[i], i !== 0))).status).toBe(200);
  }
  const primera = await api().post(`/api/estudiante/tandas/${t.id}/revisar`).set(auth(token));
  expect(primera.body.terminado).toBe(false);
  expect(primera.body.aCorregir).toEqual([ids[0]]);
  await api().post(`/api/estudiante/tandas/${t.id}/respuestas`).set(auth(token))
    .send(await require('./helpers').cuerpoTanda(ids[0], true));
  const fin = await api().post(`/api/estudiante/tandas/${t.id}/revisar`).set(auth(token));
  expect(fin.body.resultado.decision).toBe('repetir');
}

describe('CU22/CU23 — Solicitar ayuda y conversar con docente autorizado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no permite pedir ayuda antes de acumular las tres tandas; tras tres fallas habilita la solicitud', async () => {
    const { docente, estudiante } = await escenario();
    const t = estudiante.token;
    const anticipada = await api().post('/api/videollamadas').set(auth(t)).send({ motivo: 'ayuda' });
    expect(anticipada.status).toBe(403);
    expect(anticipada.body.error.code).toBe('VIDEO_NO_HABILITADO');
    for (let i = 0; i < 3; i++) await tandaFallida(t);
    const opciones = await api().get('/api/videollamadas/opciones').set(auth(t));
    expect(opciones.body.opciones.ayuda).toBe(true);
    const solicitud = await api().post('/api/videollamadas').set(auth(t)).send({ motivo: 'ayuda' });
    expect(solicitud.status).toBe(201);
    const id = solicitud.body.solicitud.id;
    expect(solicitud.body.solicitud.estado).toBe('pendiente');
    expect((await api().post('/api/videollamadas').set(auth(t)).send({ motivo: 'ayuda' })).status).toBe(409);
    expect((await api().get(`/api/videollamadas/${id}/acceso`).set(auth(t))).status).toBe(409);
    const pendientes = await api().get('/api/videollamadas').set(auth(docente.token));
    expect(pendientes.body.solicitudes.map((s) => s.id)).toContain(id);
    const aceptada = await api().post(`/api/videollamadas/${id}/aceptar`).set(auth(docente.token));
    expect(aceptada.status).toBe(200);
    expect(aceptada.body.solicitud.estado).toBe('aceptada');
    expect(provider.crearSala).toHaveBeenCalledTimes(1);
    for (const token of [docente.token, t]) {
      const acceso = await api().get(`/api/videollamadas/${id}/acceso`).set(auth(token));
      expect(acceso.status).toBe(200);
      expect(acceso.body.url).toBe('wss://demo-escuela.livekit.cloud');
      expect(acceso.body.proveedor).toBe('livekit');
      expect(acceso.body.token).toMatch(/^token-(estudiante|docente)-/);
      expect(acceso.body.sala).toMatch(/^RumboSIMCE/);
      expect(acceso.headers['cache-control']).toBe('no-store');
    }
    const final = await api().post(`/api/videollamadas/${id}/finalizar`).set(auth(docente.token));
    expect(final.body.solicitud.estado).toBe('finalizada');
    expect(provider.eliminarSala).toHaveBeenCalledTimes(1); // cierre lógico: no revoca participantes ya conectados
    expect((await api().get(`/api/videollamadas/${id}/acceso`).set(auth(t))).status).toBe(409);
  });

  test('el diagnóstico se puede pedir antes de practicar y cancelar sin crear sala', async () => {
    const { estudiante } = await escenario();
    const r = await api().post('/api/videollamadas').set(auth(estudiante.token)).send({ motivo: 'diagnostico' });
    expect(r.status).toBe(201);
    const id = r.body.solicitud.id;
    expect((await api().post(`/api/videollamadas/${id}/cancelar`).set(auth(estudiante.token))).status).toBe(200);
    expect(provider.crearSala).not.toHaveBeenCalled();
  });

  test('docentes ajenos no pueden aceptar ni obtener un enlace', async () => {
    const { estudiante } = await escenario();
    const intruso = await crearAdulto('docente');
    const s = await api().post('/api/videollamadas').set(auth(estudiante.token)).send({ motivo: 'diagnostico' });
    const id = s.body.solicitud.id;
    expect((await api().post(`/api/videollamadas/${id}/aceptar`).set(auth(intruso.token))).status).toBe(404);
    expect((await api().get(`/api/videollamadas/${id}/acceso`).set(auth(intruso.token))).status).toBe(404);
    expect((await api().get('/api/videollamadas').set(auth(intruso.token))).body.solicitudes).toEqual([]);
    expect((await api().get(`/api/videollamadas/${id}/acceso`).set(auth(estudiante.apo.token))).status).toBe(403);
  });

  test('se exige consentimiento vigente antes de pedir videollamada', async () => {
    const { estudiante } = await escenario();
    await api().delete('/api/apoderado/consentimiento').set(auth(estudiante.apo.token));
    const s = await api().post('/api/videollamadas').set(auth(estudiante.token)).send({ motivo: 'diagnostico' });
    expect(s.status).toBe(403);
    expect(s.body.error.code).toBe('SIN_CONSENTIMIENTO');
  });

  test('solicitud de cierre solo si hay nivel pendiente', async () => {
    const { estudiante } = await escenario();
    const t = estudiante.token;
    expect((await api().post('/api/videollamadas').set(auth(t)).send({ motivo: 'cierre_nivel' })).status).toBe(403);
    await api().post('/api/estudiante/tandas').set(auth(t)); // crea la posición
    await pool.query('UPDATE estudiante_posicion SET cierre_nivel_pendiente = true WHERE estudiante_id = $1', [estudiante.id]);
    const s = await api().post('/api/videollamadas').set(auth(t)).send({ motivo: 'cierre_nivel' });
    expect(s.status).toBe(201);
  });
});
