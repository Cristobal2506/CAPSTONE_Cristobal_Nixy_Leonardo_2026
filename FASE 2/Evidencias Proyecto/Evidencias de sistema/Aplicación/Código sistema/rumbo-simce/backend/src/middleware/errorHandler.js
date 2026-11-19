const { HttpError } = require('../lib/errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'JSON_INVALIDO', message: 'Cuerpo JSON inválido' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' } });
}

module.exports = { errorHandler };
