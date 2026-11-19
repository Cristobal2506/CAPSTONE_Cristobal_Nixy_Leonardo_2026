// HU-04 — Bloqueo temporal tras intentos fallidos + bitácora de eventos de acceso.
const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const { locked } = require('./errors');

const TABLAS = { usuario: 'usuario', estudiante: 'estudiante' };

async function registrarEvento(tipo, { usuarioId = null, estudianteId = null }, client = db) {
  await client.query(
    'INSERT INTO evento_acceso (tipo, usuario_id, estudiante_id) VALUES ($1, $2, $3)',
    [tipo, usuarioId, estudianteId],
  );
}

const minutosRestantes = (hasta) => Math.max(1, Math.ceil((new Date(hasta) - Date.now()) / 60000));

/** Lanza 423 si la cuenta (fila con `bloqueado_hasta`) sigue bloqueada. */
function verificarNoBloqueada(fila, mensaje) {
  if (fila?.bloqueado_hasta && new Date(fila.bloqueado_hasta) > new Date()) {
    const min = minutosRestantes(fila.bloqueado_hasta);
    throw locked(mensaje(min), { reintentarEnMinutos: min });
  }
}

/**
 * Suma un intento fallido. Si llega al máximo, bloquea por `bloqueoMinutos`.
 * Si el bloqueo anterior ya venció, el contador parte de nuevo en 1.
 * Devuelve la fila actualizada ({ intentos_fallidos, bloqueado_hasta }).
 */
async function registrarFallo(tipo, id) {
  const tabla = TABLAS[tipo];
  const nuevo = `CASE WHEN bloqueado_hasta IS NOT NULL AND bloqueado_hasta <= now() THEN 1
                      ELSE intentos_fallidos + 1 END`;
  const { rows } = await db.query(
    `UPDATE ${tabla} SET
       intentos_fallidos = ${nuevo},
       bloqueado_hasta = CASE
         WHEN ${nuevo} >= $2 THEN now() + make_interval(mins => $3)
         WHEN bloqueado_hasta <= now() THEN NULL
         ELSE bloqueado_hasta END
     WHERE id = $1
     RETURNING intentos_fallidos, bloqueado_hasta`,
    [id, config.maxIntentosLogin, config.bloqueoMinutos],
  );
  const ref = tipo === 'usuario' ? { usuarioId: id } : { estudianteId: id };
  await registrarEvento('login_fallido', ref);
  const fila = rows[0];
  if (fila.intentos_fallidos >= config.maxIntentosLogin) await registrarEvento('bloqueo', ref);
  return fila;
}

async function registrarExito(tipo, id) {
  await db.query(
    `UPDATE ${TABLAS[tipo]} SET intentos_fallidos = 0, bloqueado_hasta = NULL
     WHERE id = $1 AND (intentos_fallidos <> 0 OR bloqueado_hasta IS NOT NULL)`,
    [id],
  );
  await registrarEvento('login_ok', tipo === 'usuario' ? { usuarioId: id } : { estudianteId: id });
}

// ── Código de recuperación (CU07) ──
/** Código numérico de 6 dígitos, uniforme. */
const generarCodigoNumerico = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/** HMAC con el secreto del servidor: un volcado de la base no permite probar los 10^6 códigos. */
const hashCodigo = (usuarioId, codigo) =>
  crypto.createHmac('sha256', config.jwtSecret).update(`${usuarioId}:${codigo}`).digest('hex');

const igualesSeguro = (a, b) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

module.exports = {
  registrarEvento,
  verificarNoBloqueada,
  registrarFallo,
  registrarExito,
  generarCodigoNumerico,
  hashCodigo,
  igualesSeguro,
};
