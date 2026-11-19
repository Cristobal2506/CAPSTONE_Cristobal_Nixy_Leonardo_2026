// Pruebas de aceptación de los casos de uso del Sprint 1 (CU01–CU07).
const { api, crearAdulto, auth, emailUnico } = require('./helpers');
const { pool } = require('../src/db');
const { bandejaPrueba } = require('../src/lib/mailer');

afterAll(() => pool.end());

describe('CU02 — Registrar cuenta', () => {
  test('registra un apoderado y devuelve token', async () => {
    const res = await api().post('/api/auth/registro')
      .send({ email: emailUnico(), password: 'claveSegura1', nombre: 'Ana Pérez', rol: 'apoderado' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario).toMatchObject({ nombre: 'Ana Pérez', rol: 'apoderado' });
    expect(res.body.usuario.password_hash).toBeUndefined();
  });

  test('rechaza correo duplicado (sin importar mayúsculas)', async () => {
    const email = emailUnico();
    await api().post('/api/auth/registro').send({ email, password: 'claveSegura1', nombre: 'Uno', rol: 'docente' });
    const res = await api().post('/api/auth/registro')
      .send({ email: email.toUpperCase(), password: 'claveSegura1', nombre: 'Dos', rol: 'docente' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EN_USO');
  });

  test('no permite auto-registrarse como admin', async () => {
    const res = await api().post('/api/auth/registro')
      .send({ email: emailUnico(), password: 'claveSegura1', nombre: 'X', rol: 'admin' });
    expect(res.status).toBe(400);
  });

  test('valida largo mínimo de contraseña', async () => {
    const res = await api().post('/api/auth/registro')
      .send({ email: emailUnico(), password: '123', nombre: 'X', rol: 'apoderado' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDACION');
  });
});

describe('CU01 — Iniciar sesión según rol', () => {
  test('login correcto y /me devuelve el rol', async () => {
    const { email } = await crearAdulto('docente');
    const login = await api().post('/api/auth/login').send({ email, password: 'claveSegura1' });
    expect(login.status).toBe(200);
    const me = await api().get('/api/me').set(auth(login.body.token));
    expect(me.body.rol).toBe('docente');
  });

  test('contraseña incorrecta → 401', async () => {
    const { email } = await crearAdulto();
    const res = await api().post('/api/auth/login').send({ email, password: 'otraClave99' });
    expect(res.status).toBe(401);
  });

  test('rutas protegidas exigen token y rol', async () => {
    expect((await api().get('/api/me')).status).toBe(401);
    const docente = await crearAdulto('docente');
    const res = await api().get('/api/apoderado/estudiantes').set(auth(docente.token));
    expect(res.status).toBe(403);
  });
});

describe('CU03 / CU04 — Consentimiento y creación de estudiante', () => {
  test('no se puede crear estudiante sin consentimiento', async () => {
    const { token } = await crearAdulto();
    const res = await api().post('/api/apoderado/estudiantes').set(auth(token)).send({ apodo: 'Tomi', pin: '1234' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SIN_CONSENTIMIENTO');
  });

  test('con consentimiento crea estudiante, lo vincula y el niño entra con código + PIN', async () => {
    const { token } = await crearAdulto();
    const c = await api().post('/api/apoderado/consentimiento').set(auth(token)).send({ acepta: true });
    expect(c.status).toBe(201);

    const res = await api().post('/api/apoderado/estudiantes').set(auth(token)).send({ apodo: 'Tomi', pin: '1234' });
    expect(res.status).toBe(201);
    const { codigo_acceso: codigo } = res.body.estudiante;
    expect(codigo).toMatch(/^[A-Z2-9]{6}$/);

    const lista = await api().get('/api/apoderado/estudiantes').set(auth(token));
    expect(lista.body.estudiantes).toHaveLength(1);

    const login = await api().post('/api/auth/login-estudiante').send({ codigo: codigo.toLowerCase(), pin: '1234' });
    expect(login.status).toBe(200);
    const me = await api().get('/api/me').set(auth(login.body.token));
    expect(me.body).toMatchObject({ rol: 'estudiante', estudiante: { apodo: 'Tomi' } });

    const malPin = await api().post('/api/auth/login-estudiante').send({ codigo, pin: '9999' });
    expect(malPin.status).toBe(401);
  });

  test('revocar consentimiento bloquea crear nuevos estudiantes', async () => {
    const { token } = await crearAdulto();
    await api().post('/api/apoderado/consentimiento').set(auth(token)).send({ acepta: true });
    await api().delete('/api/apoderado/consentimiento').set(auth(token));
    const res = await api().post('/api/apoderado/estudiantes').set(auth(token)).send({ apodo: 'Sofi', pin: '4321' });
    expect(res.status).toBe(403);
  });
});

describe('CU05 / CU06 — Curso e inscripción', () => {
  test('docente crea curso; apoderado inscribe a su estudiante con el código', async () => {
    const docente = await crearAdulto('docente');
    const curso = await api().post('/api/docente/cursos').set(auth(docente.token))
      .send({ nombre: '4° Básico A', establecimiento: 'Escuela de Prueba' });
    expect(curso.status).toBe(201);
    const { codigo_union: codigoCurso, id: cursoId } = curso.body.curso;

    const apo = await crearAdulto();
    await api().post('/api/apoderado/consentimiento').set(auth(apo.token)).send({ acepta: true });
    const est = await api().post('/api/apoderado/estudiantes').set(auth(apo.token)).send({ apodo: 'Martín', pin: '1111' });

    const insc = await api().post(`/api/apoderado/estudiantes/${est.body.estudiante.id}/curso`)
      .set(auth(apo.token)).send({ codigoCurso });
    expect(insc.status).toBe(200);

    const alumnos = await api().get(`/api/docente/cursos/${cursoId}/estudiantes`).set(auth(docente.token));
    expect(alumnos.body.estudiantes).toEqual([expect.objectContaining({ apodo: 'Martín' })]);
    expect(alumnos.body.estudiantes[0].codigo_acceso).toBeUndefined(); // el docente no ve credenciales
  });

  test('un apoderado no puede inscribir al estudiante de otro', async () => {
    const docente = await crearAdulto('docente');
    const curso = await api().post('/api/docente/cursos').set(auth(docente.token)).send({ nombre: '4° B' });
    const apo1 = await crearAdulto();
    await api().post('/api/apoderado/consentimiento').set(auth(apo1.token)).send({ acepta: true });
    const est = await api().post('/api/apoderado/estudiantes').set(auth(apo1.token)).send({ apodo: 'Lu', pin: '2222' });

    const apo2 = await crearAdulto();
    const res = await api().post(`/api/apoderado/estudiantes/${est.body.estudiante.id}/curso`)
      .set(auth(apo2.token)).send({ codigoCurso: curso.body.curso.codigo_union });
    expect(res.status).toBe(404);
  });
});

describe('CU07 — Recuperar contraseña', () => {
  const codigoDelCorreo = (email) => {
    const correo = [...bandejaPrueba].reverse().find((c) => c.para === email);
    return correo?.texto.match(/\b(\d{6})\b/)?.[1];
  };

  test('envía un código por correo y lo acepta una sola vez', async () => {
    const { email } = await crearAdulto();
    const rec = await api().post('/api/auth/recuperar').send({ email });
    expect(rec.status).toBe(200);
    expect(rec.body.tokenDesarrollo).toBeUndefined(); // el código solo viaja por correo
    const codigo = codigoDelCorreo(email);
    expect(codigo).toMatch(/^\d{6}$/);

    const ok = await api().post('/api/auth/restablecer').send({ email, codigo, password: 'nuevaClave123' });
    expect(ok.status).toBe(200);
    const reuse = await api().post('/api/auth/restablecer').send({ email, codigo, password: 'otraClave123' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('CODIGO_INVALIDO');

    const login = await api().post('/api/auth/login').send({ email, password: 'nuevaClave123' });
    expect(login.status).toBe(200);
  });

  test('correo inexistente responde igual y no envía nada (no revela cuentas)', async () => {
    const antes = bandejaPrueba.length;
    const res = await api().post('/api/auth/recuperar').send({ email: 'nadie@test.cl' });
    expect(res.status).toBe(200);
    expect(bandejaPrueba.length).toBe(antes);
  });

  test('el código se anula tras 5 intentos erróneos', async () => {
    const { email } = await crearAdulto();
    await api().post('/api/auth/recuperar').send({ email });
    const codigo = codigoDelCorreo(email);
    const malo = codigo === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await api().post('/api/auth/restablecer').send({ email, codigo: malo, password: 'nuevaClave123' });
    }
    const res = await api().post('/api/auth/restablecer').send({ email, codigo, password: 'nuevaClave123' });
    expect(res.status).toBe(400);
  });

  test('un código nuevo anula el anterior', async () => {
    const { email } = await crearAdulto();
    await api().post('/api/auth/recuperar').send({ email });
    const primero = codigoDelCorreo(email);
    await api().post('/api/auth/recuperar').send({ email });
    const segundo = codigoDelCorreo(email);
    if (primero !== segundo) {
      const viejo = await api().post('/api/auth/restablecer').send({ email, codigo: primero, password: 'nuevaClave123' });
      expect(viejo.status).toBe(400);
    }
    const nuevo = await api().post('/api/auth/restablecer').send({ email, codigo: segundo, password: 'nuevaClave123' });
    expect(nuevo.status).toBe(200);
  });

  test('máximo 3 correos de recuperación cada 15 minutos por cuenta', async () => {
    const { email } = await crearAdulto();
    for (let i = 0; i < 5; i++) await api().post('/api/auth/recuperar').send({ email });
    expect(bandejaPrueba.filter((c) => c.para === email)).toHaveLength(3);
  });
});

describe('Mapa — ejes', () => {
  test('devuelve las 5 islas en orden', async () => {
    const { token } = await crearAdulto();
    const res = await api().get('/api/ejes').set(auth(token));
    expect(res.body.ejes.map((e) => e.codigo)).toEqual(['numeros', 'patrones', 'geometria', 'medicion', 'datos']);
  });
});
