const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized, forbidden } = require('../lib/errors');

/**
 * Token JWT. `sub` es el id del usuario adulto o del estudiante, y `rol` indica cuál.
 * Roles: 'apoderado' | 'docente' | 'admin' | 'estudiante'
 */
function firmarToken({ id, rol }) {
  return jwt.sign({ sub: String(id), rol }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  if (tipo !== 'Bearer' || !token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: Number(payload.sub), rol: payload.rol };
    next();
  } catch {
    next(unauthorized('Token inválido o expirado', 'TOKEN_INVALIDO'));
  }
}

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.rol)) return next(forbidden());
  next();
};

module.exports = { firmarToken, requireAuth, requireRole };
