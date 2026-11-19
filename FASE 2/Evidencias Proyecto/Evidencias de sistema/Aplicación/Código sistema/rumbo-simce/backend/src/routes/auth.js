// CU01 Iniciar sesión · CU02 Registrar cuenta · CU07 Recuperar contraseña
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const config = require('../config');
const { validate } = require('../middleware/validate');
const { firmarToken } = require('../middleware/auth');
const { unauthorized, conflict, badRequest } = require('../lib/errors');
const seg = require('../lib/seguridad');
const { enviarCorreo, correoRecuperacion } = require('../lib/mailer');

const router = express.Router();

const emailSchema = z.email().transform((e) => e.toLowerCase());
const password = z.string().min(8, 'mínimo 8 caracteres').max(72);

const registroSchema = z.object({
  email: emailSchema,
  password,
  nombre: z.string().trim().min(2).max(120),
  // El registro público solo crea adultos; 'admin' se crea por seed.
  rol: z.enum(['apoderado', 'docente']),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const loginEstudianteSchema = z.object({
  codigo: z.string().trim().length(6).transform((c) => c.toUpperCase()),
  pin: z.string().regex(/^\d{4}$/, 'el PIN son 4 dígitos'),
});

// Hash de relleno: si el correo no existe igual se ejecuta un bcrypt.compare,
// así el tiempo de respuesta no revela qué correos están registrados.
const HASH_RELLENO = bcrypt.hashSync('relleno-no-es-una-clave', 10);

const usuarioPublico = (u) => ({ id: Number(u.id), email: u.email, nombre: u.nombre, rol: u.rol });

// CU02 — Registrar cuenta de apoderado o docente
router.post('/registro', validate(registroSchema), async (req, res) => {
  const { email, password: pass, nombre, rol } = req.body;
  const hash = await bcrypt.hash(pass, 10);
  try {
    const { rows } = await db.query(
      `INSERT INTO usuario (email, password_hash, nombre, rol) VALUES ($1,$2,$3,$4)
       RETURNING id, email, nombre, rol`,
      [email, hash, nombre, rol],
    );
    const usuario = usuarioPublico(rows[0]);
    res.status(201).json({ token: firmarToken(usuario), usuario });
  } catch (err) {
    if (err.code === '23505') throw conflict('Ya existe una cuenta con ese correo', 'EMAIL_EN_USO');
    throw err;
  }
});

// CU01 — Login de adultos (con bloqueo temporal tras intentos fallidos, HU-04)
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password: pass } = req.body;
  const { rows } = await db.query(
    'SELECT id, email, nombre, rol, password_hash, activo, bloqueado_hasta FROM usuario WHERE email = $1',
    [email],
  );
  const u = rows[0];
  seg.verificarNoBloqueada(u, (min) =>
    `Por seguridad bloqueamos la cuenta por demasiados intentos. Intenta de nuevo en ${min} minuto${min === 1 ? '' : 's'}.`);

  const coincide = await bcrypt.compare(pass, u?.password_hash ?? HASH_RELLENO);
  if (!u || !u.activo || !coincide) {
    if (u) {
      const fila = await seg.registrarFallo('usuario', u.id);
      seg.verificarNoBloqueada(fila, (min) =>
        `Demasiados intentos fallidos. Por seguridad la cuenta queda bloqueada ${min} minutos.`);
    }
    throw unauthorized('Correo o contraseña incorrectos', 'CREDENCIALES_INVALIDAS');
  }
  await seg.registrarExito('usuario', u.id);
  const usuario = usuarioPublico(u);
  res.json({ token: firmarToken(usuario), usuario });
});

// CU01 — Login del estudiante con código + PIN (sin correo: minimización de datos).
// El PIN tiene solo 10.000 combinaciones: el bloqueo (HU-04) es lo que impide adivinarlo.
router.post('/login-estudiante', validate(loginEstudianteSchema), async (req, res) => {
  const { codigo, pin } = req.body;
  const { rows } = await db.query(
    'SELECT id, apodo, avatar, pin_hash, bloqueado_hasta FROM estudiante WHERE codigo_acceso = $1',
    [codigo],
  );
  const e = rows[0];
  const mensajeBloqueo = (min) =>
    `Hiciste muchos intentos. Descansa un ratito y prueba de nuevo en ${min} minuto${min === 1 ? '' : 's'}.`;
  seg.verificarNoBloqueada(e, mensajeBloqueo);

  const coincide = await bcrypt.compare(pin, e?.pin_hash ?? HASH_RELLENO);
  if (!e || !coincide) {
    if (e) seg.verificarNoBloqueada(await seg.registrarFallo('estudiante', e.id), mensajeBloqueo);
    throw unauthorized('Código o PIN incorrectos', 'CREDENCIALES_INVALIDAS');
  }
  await seg.registrarExito('estudiante', e.id);
  res.json({
    token: firmarToken({ id: e.id, rol: 'estudiante' }),
    estudiante: { id: Number(e.id), apodo: e.apodo, avatar: e.avatar },
  });
});

// CU07 — Solicitar recuperación: envía un código de 6 dígitos al correo.
// Siempre responde lo mismo para no revelar si el correo está registrado.
router.post('/recuperar', validate(z.object({ email: emailSchema })), async (req, res) => {
  const { vigenciaMinutos, maxSolicitudes } = config.recuperacion;
  const { rows } = await db.query('SELECT id, nombre, email FROM usuario WHERE email = $1 AND activo', [req.body.email]);
  const u = rows[0];
  if (u) {
    const { rows: recientes } = await db.query(
      `SELECT COUNT(*)::int AS n FROM evento_acceso
       WHERE usuario_id = $1 AND tipo = 'recuperacion_solicitada' AND ocurrido_en > now() - interval '15 minutes'`,
      [u.id],
    );
    if (recientes[0].n < maxSolicitudes) {
      const codigo = seg.generarCodigoNumerico();
      await db.transaction(async (client) => {
        // Un código nuevo anula los anteriores que no se usaron.
        await client.query('DELETE FROM token_recuperacion WHERE usuario_id = $1 AND usado_en IS NULL', [u.id]);
        await client.query(
          `INSERT INTO token_recuperacion (usuario_id, token_hash, expira_en)
           VALUES ($1, $2, now() + make_interval(mins => $3))`,
          [u.id, seg.hashCodigo(u.id, codigo), vigenciaMinutos],
        );
        await seg.registrarEvento('recuperacion_solicitada', { usuarioId: u.id }, client);
      });
      const correo = correoRecuperacion({ nombre: u.nombre, codigo, minutos: vigenciaMinutos });
      await enviarCorreo({ para: u.email, ...correo });
    }
  }
  res.json({ mensaje: 'Si el correo está registrado, te enviamos un código para restablecer la contraseña.' });
});

// CU07 — Restablecer contraseña con el código recibido
const restablecerSchema = z.object({
  email: emailSchema,
  codigo: z.string().trim().regex(/^\d{6}$/, 'el código son 6 dígitos'),
  password,
});

router.post('/restablecer', validate(restablecerSchema), async (req, res) => {
  const { email, codigo, password: pass } = req.body;
  const invalido = () => badRequest('El código no es válido o ya expiró. Solicita uno nuevo.', 'CODIGO_INVALIDO');

  // El resultado se decide dentro de la transacción y el error se lanza después del COMMIT,
  // para que el intento fallido quede guardado.
  const ok = await db.transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT t.id, t.usuario_id, t.token_hash, t.intentos FROM token_recuperacion t
       JOIN usuario u ON u.id = t.usuario_id
       WHERE u.email = $1 AND t.usado_en IS NULL AND t.expira_en > now()
       ORDER BY t.creado_en DESC LIMIT 1 FOR UPDATE OF t`,
      [email],
    );
    const t = rows[0];
    if (!t || t.intentos >= config.recuperacion.maxIntentosCodigo) return false;
    if (!seg.igualesSeguro(t.token_hash, seg.hashCodigo(t.usuario_id, codigo))) {
      await client.query('UPDATE token_recuperacion SET intentos = intentos + 1 WHERE id = $1', [t.id]);
      return false;
    }
    const nuevoHash = await bcrypt.hash(pass, 10);
    // Restablecer también levanta un bloqueo por intentos fallidos (HU-04).
    await client.query(
      `UPDATE usuario SET password_hash = $1, intentos_fallidos = 0, bloqueado_hasta = NULL, actualizado_en = now()
       WHERE id = $2`,
      [nuevoHash, t.usuario_id],
    );
    await client.query('UPDATE token_recuperacion SET usado_en = now() WHERE id = $1', [t.id]);
    await seg.registrarEvento('contrasena_restablecida', { usuarioId: t.usuario_id }, client);
    return true;
  });
  if (!ok) throw invalido();
  res.json({ mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});

module.exports = router;
