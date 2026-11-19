// Pruebas de aceptación — HU-04 (bloqueo por intentos) y HU-05 / HU-06 (perfil).
const { api, crearAdulto, auth } = require('./helpers');
const { pool } = require('../src/db');
const config = require('../src/config');

afterAll(() => pool.end());

const MAX = config.maxIntentosLogin;

async function crearEstudiante() {
  const apo = await crearAdulto();
  await api().post('/api/apoderado/consentimiento').set(auth(apo.token)).send({ acepta: true });
  const res = await api().post('/api/apoderado/estudiantes').set(auth(apo.token)).send({ apodo: 'Pía', pin: '4826' });
  return { apo, codigo: res.body.estudiante.codigo_acceso, id: res.body.estudiante.id };
}

describe('HU-04 — Bloqueo tras intentos fallidos', () => {
  test(`adulto: al intento fallido N°${MAX} la cuenta se bloquea e informa el tiempo de espera`, async () => {
    const { email, usuario } = await crearAdulto();
    for (let i = 1; i < MAX; i++) {
      const r = await api().post('/api/auth/login').send({ email, password: 'malaClave99' });
      expect(r.status).toBe(401);
    }
    const ultimo = await api().post('/api/auth/login').send({ email, password: 'malaClave99' });
    expect(ultimo.status).toBe(423);
    expect(ultimo.body.error.code).toBe('CUENTA_BLOQUEADA');
    expect(ultimo.body.error.reintentarEnMinutos).toBe(config.bloqueoMinutos);

    // Bloqueada, ni siquiera la contraseña correcta entra
    const correcta = await api().post('/api/auth/login').send({ email, password: 'claveSegura1' });
    expect(correcta.status).toBe(423);

    // El bloqueo queda registrado
    const { rows } = await pool.query(
      "SELECT tipo FROM evento_acceso WHERE usuario_id = $1 AND tipo = 'bloqueo'", [usuario.id]);
    expect(rows).toHaveLength(1);
  });

  test('al vencer el bloqueo puede entrar y el contador vuelve a cero', async () => {
    const { email, usuario } = await crearAdulto();
    for (let i = 0; i < MAX; i++) await api().post('/api/auth/login').send({ email, password: 'malaClave99' });
    // Simula que pasó el tiempo de bloqueo
    await pool.query("UPDATE usuario SET bloqueado_hasta = now() - interval '1 second' WHERE id = $1", [usuario.id]);

    const ok = await api().post('/api/auth/login').send({ email, password: 'claveSegura1' });
    expect(ok.status).toBe(200);
    const { rows } = await pool.query('SELECT intentos_fallidos, bloqueado_hasta FROM usuario WHERE id = $1', [usuario.id]);
    expect(rows[0]).toEqual({ intentos_fallidos: 0, bloqueado_hasta: null });
  });

  test('un login correcto reinicia el contador de fallos', async () => {
    const { email } = await crearAdulto();
    for (let i = 1; i < MAX; i++) await api().post('/api/auth/login').send({ email, password: 'malaClave99' });
    expect((await api().post('/api/auth/login').send({ email, password: 'claveSegura1' })).status).toBe(200);
    const r = await api().post('/api/auth/login').send({ email, password: 'malaClave99' });
    expect(r.status).toBe(401); // no se bloquea: el contador partió de nuevo
  });

  test('el mensaje de error no revela si falló el correo o la contraseña', async () => {
    const { email } = await crearAdulto();
    const malaClave = await api().post('/api/auth/login').send({ email, password: 'malaClave99' });
    const malCorreo = await api().post('/api/auth/login').send({ email: 'noexiste@test.cl', password: 'malaClave99' });
    expect(malaClave.body).toEqual(malCorreo.body);
  });

  test('estudiante: el PIN también se bloquea tras varios intentos', async () => {
    const { codigo } = await crearEstudiante();
    for (let i = 1; i < MAX; i++) {
      expect((await api().post('/api/auth/login-estudiante').send({ codigo, pin: '0000' })).status).toBe(401);
    }
    const r = await api().post('/api/auth/login-estudiante').send({ codigo, pin: '0000' });
    expect(r.status).toBe(423);
    expect(r.body.error.message).toMatch(/minuto/);
    expect((await api().post('/api/auth/login-estudiante').send({ codigo, pin: '4826' })).status).toBe(423);
  });

  test('restablecer la contraseña levanta el bloqueo', async () => {
    const { bandejaPrueba } = require('../src/lib/mailer');
    const { email } = await crearAdulto();
    for (let i = 0; i < MAX; i++) await api().post('/api/auth/login').send({ email, password: 'malaClave99' });
    await api().post('/api/auth/recuperar').send({ email });
    const codigo = bandejaPrueba.filter((c) => c.para === email).pop().texto.match(/\b(\d{6})\b/)[1];
    await api().post('/api/auth/restablecer').send({ email, codigo, password: 'otraClave123' });
    expect((await api().post('/api/auth/login').send({ email, password: 'otraClave123' })).status).toBe(200);
  });
});

describe('HU-05 — Consultar perfil', () => {
  test('el adulto ve sus datos, sin hash de contraseña', async () => {
    const { token, email } = await crearAdulto('docente');
    const res = await api().get('/api/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.usuario).toEqual({ id: expect.any(Number), email, nombre: 'Test docente', rol: 'docente' });
  });

  test('el estudiante ve su apodo y avatar, nunca su código ni su PIN', async () => {
    const { codigo } = await crearEstudiante();
    const login = await api().post('/api/auth/login-estudiante').send({ codigo, pin: '4826' });
    const res = await api().get('/api/me').set(auth(login.body.token));
    expect(res.body.estudiante).toMatchObject({ apodo: 'Pía', avatar: 'condor' });
    expect(res.body.estudiante.codigo_acceso).toBeUndefined();
    expect(res.body.estudiante.pin_hash).toBeUndefined();
  });
});

describe('HU-06 — Editar perfil', () => {
  test('el adulto edita su nombre y el cambio se refleja', async () => {
    const { token } = await crearAdulto();
    const res = await api().patch('/api/me').set(auth(token)).send({ nombre: '  Carla Rojas ' });
    expect(res.status).toBe(200);
    expect(res.body.usuario.nombre).toBe('Carla Rojas');
    expect((await api().get('/api/me').set(auth(token))).body.usuario.nombre).toBe('Carla Rojas');
  });

  test('datos inválidos o campos no editables se rechazan y no se guardan', async () => {
    const { token } = await crearAdulto();
    expect((await api().patch('/api/me').set(auth(token)).send({ nombre: 'X' })).status).toBe(400);
    expect((await api().patch('/api/me').set(auth(token)).send({ nombre: 'Válido', rol: 'admin' })).status).toBe(400);
    expect((await api().patch('/api/me').set(auth(token)).send({ email: 'otro@test.cl' })).status).toBe(400);
    const me = await api().get('/api/me').set(auth(token));
    expect(me.body.usuario).toMatchObject({ nombre: 'Test apoderado', rol: 'apoderado' });
  });

  test('el estudiante solo puede cambiar su avatar', async () => {
    const { codigo } = await crearEstudiante();
    const { body } = await api().post('/api/auth/login-estudiante').send({ codigo, pin: '4826' });
    const ok = await api().patch('/api/me').set(auth(body.token)).send({ avatar: 'llama' });
    expect(ok.body.estudiante.avatar).toBe('llama');
    expect((await api().patch('/api/me').set(auth(body.token)).send({ apodo: 'Otro' })).status).toBe(400);
  });

  test('cambiar contraseña exige la actual', async () => {
    const { token, email } = await crearAdulto();
    const mal = await api().post('/api/me/password').set(auth(token)).send({ actual: 'noEsLaClave', nueva: 'claveNueva22' });
    expect(mal.status).toBe(400);
    expect(mal.body.error.code).toBe('CONTRASENA_ACTUAL_INCORRECTA');

    const ok = await api().post('/api/me/password').set(auth(token)).send({ actual: 'claveSegura1', nueva: 'claveNueva22' });
    expect(ok.status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email, password: 'claveNueva22' })).status).toBe(200);
  });

  test('el estudiante no puede usar el cambio de contraseña de adultos', async () => {
    const { codigo } = await crearEstudiante();
    const { body } = await api().post('/api/auth/login-estudiante').send({ codigo, pin: '4826' });
    const res = await api().post('/api/me/password').set(auth(body.token)).send({ actual: '4826', nueva: '12345678' });
    expect(res.status).toBe(403);
  });
});
