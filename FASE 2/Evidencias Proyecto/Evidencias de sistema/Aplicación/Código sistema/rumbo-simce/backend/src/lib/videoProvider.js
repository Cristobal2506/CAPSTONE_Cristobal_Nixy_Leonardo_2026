// v11 — LiveKit Cloud: JWT individual generado SOLO en el servidor.
// Reutiliza jsonwebtoken del backend; no incorpora secreto en el APK.
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { HttpError } = require('./errors');

function configuracion() {
  const apiKey = (process.env.LIVEKIT_API_KEY || '').trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || '').trim();
  const raw = (process.env.LIVEKIT_URL || '').trim();
  if (!apiKey || !apiSecret || !raw) {
    throw new HttpError(503, 'Configura LIVEKIT_URL, LIVEKIT_API_KEY y LIVEKIT_API_SECRET en backend/.env', 'LIVEKIT_SIN_CONFIGURAR');
  }
  let url;
  try { url = new URL(raw); }
  catch { throw new HttpError(503, 'LIVEKIT_URL no es una URL válida', 'LIVEKIT_URL_INVALIDA'); }
  if (url.protocol !== 'wss:' || !url.hostname || url.username || url.password ||
      (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new HttpError(503, 'LIVEKIT_URL debe ser wss://host sin ruta, credenciales ni parámetros', 'LIVEKIT_URL_INVALIDA');
  }
  return { apiKey, apiSecret, url: url.origin };
}

function validarSala(salaNombre) {
  if (typeof salaNombre !== 'string' || !/^RumboSIMCE[a-f0-9]{32}$/.test(salaNombre)) {
    throw new HttpError(502, 'Nombre de sala no válido', 'VIDEO_SALA_INVALIDA');
  }
}

async function crearSala() {
  const { url } = configuracion();
  // LiveKit crea la sala cuando entra el primer participante autorizado.
  return { nombre: `RumboSIMCE${crypto.randomBytes(16).toString('hex')}`, url };
}

async function enlaceDeAcceso({ salaNombre, salaUrl, usuario }) {
  validarSala(salaNombre);
  const { apiKey, apiSecret, url } = configuracion();
  if (salaUrl !== url) {
    throw new HttpError(502, 'Servidor LiveKit de la solicitud no coincide con el configurado', 'VIDEO_SALA_INVALIDA');
  }
  if (!usuario || !Number.isInteger(usuario.id) || !['estudiante', 'docente'].includes(usuario.rol)) {
    throw new HttpError(403, 'Participante no autorizado', 'VIDEO_NO_AUTORIZADO');
  }
  const identidad = `${usuario.rol}-${usuario.id}`;
  const nombre = usuario.rol === 'docente' ? 'Docente de prueba' : 'Alumno de prueba';
  const token = jwt.sign({
    name: nombre,
    video: {
      roomJoin: true, room: salaNombre,
      canPublish: true, canSubscribe: true,
      canPublishData: false,
    },
  }, apiSecret, {
    algorithm: 'HS256', issuer: apiKey, subject: identidad, expiresIn: '10m',
  });
  return { url, token, sala: salaNombre, proveedor: 'livekit' };
}

async function eliminarSala(_nombre) {
  // El cierre es lógico en PostgreSQL. Los tokens ya emitidos expiran en 10 min;
  // las conexiones abiertas NO se desconectan automáticamente desde la API.
}

module.exports = { configuracion, crearSala, enlaceDeAcceso, eliminarSala };
