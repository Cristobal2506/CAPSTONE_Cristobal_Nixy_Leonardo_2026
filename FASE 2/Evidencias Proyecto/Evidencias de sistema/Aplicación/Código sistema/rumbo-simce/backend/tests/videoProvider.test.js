// Pruebas del proveedor LiveKit: JWT sin recursos reales de Cloud.
const jwt = require('jsonwebtoken');
const provider = require('../src/lib/videoProvider');

const envAnterior = {};
const valores = {
  LIVEKIT_URL: 'wss://demo-escuela.livekit.cloud',
  LIVEKIT_API_KEY: 'API_DEMO_V11',
  LIVEKIT_API_SECRET: 'secret-local-de-prueba-no-real',
};

beforeAll(() => {
  for (const k of Object.keys(valores)) { envAnterior[k] = process.env[k]; process.env[k] = valores[k]; }
});
afterAll(() => {
  for (const k of Object.keys(valores)) {
    if (envAnterior[k] === undefined) delete process.env[k]; else process.env[k] = envAnterior[k];
  }
});

test('crear sala aleatoria y URL del proyecto configurado', async () => {
  const a = await provider.crearSala();
  const b = await provider.crearSala();
  expect(a.nombre).toMatch(/^RumboSIMCE[a-f0-9]{32}$/);
  expect(a.nombre).not.toBe(b.nombre);
  expect(a.url).toBe(valores.LIVEKIT_URL);
});

test('JWT separados del alumno y profesor solo para la sala autorizada', async () => {
  const sala = await provider.crearSala();
  const alumno = await provider.enlaceDeAcceso({ salaNombre: sala.nombre, salaUrl: sala.url,
    usuario: { id: 7, rol: 'estudiante' } });
  const docente = await provider.enlaceDeAcceso({ salaNombre: sala.nombre, salaUrl: sala.url,
    usuario: { id: 2, rol: 'docente' } });
  expect(alumno.proveedor).toBe('livekit');
  expect(alumno.url).toBe(sala.url);
  expect(alumno.sala).toBe(sala.nombre);
  expect(alumno.token).not.toBe(docente.token);
  const a = jwt.verify(alumno.token, valores.LIVEKIT_API_SECRET, { algorithms: ['HS256'], issuer: valores.LIVEKIT_API_KEY });
  const d = jwt.verify(docente.token, valores.LIVEKIT_API_SECRET, { algorithms: ['HS256'], issuer: valores.LIVEKIT_API_KEY });
  expect(a.sub).toBe('estudiante-7');
  expect(d.sub).toBe('docente-2');
  expect(a.video).toMatchObject({ roomJoin: true, room: sala.nombre, canPublish: true, canSubscribe: true });
  expect(a.exp - a.iat).toBe(600);
});

test('rechaza sala, URL y participante manipulados', async () => {
  await expect(provider.enlaceDeAcceso({ salaNombre: 'OtraSala', salaUrl: valores.LIVEKIT_URL,
    usuario: { id: 1, rol: 'docente' } })).rejects.toMatchObject({ code: 'VIDEO_SALA_INVALIDA' });
  await expect(provider.enlaceDeAcceso({ salaNombre: 'RumboSIMCE' + 'a'.repeat(32),
    salaUrl: 'wss://otra.livekit.cloud', usuario: { id: 1, rol: 'docente' } })).rejects.toMatchObject({ code: 'VIDEO_SALA_INVALIDA' });
  await expect(provider.enlaceDeAcceso({ salaNombre: 'RumboSIMCE' + 'a'.repeat(32),
    salaUrl: valores.LIVEKIT_URL, usuario: { id: 1, rol: 'apoderado' } })).rejects.toMatchObject({ code: 'VIDEO_NO_AUTORIZADO' });
});

test('señala falta de configuración y URL insegura', async () => {
  delete process.env.LIVEKIT_API_KEY;
  expect(() => provider.configuracion()).toThrow(/Configura LIVEKIT_URL/);
  process.env.LIVEKIT_API_KEY = valores.LIVEKIT_API_KEY;
  process.env.LIVEKIT_URL = 'http://localhost:7880';
  expect(() => provider.configuracion()).toThrow(/wss:\/\//);
  process.env.LIVEKIT_URL = valores.LIVEKIT_URL;
});

test('finalizar es cierre lógico, no desconexión remota', async () => {
  await expect(provider.eliminarSala('RumboSIMCE' + 'a'.repeat(32))).resolves.toBeUndefined();
});
