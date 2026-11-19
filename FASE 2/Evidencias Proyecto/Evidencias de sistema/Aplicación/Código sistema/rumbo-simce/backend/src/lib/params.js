const { notFound } = require('./errors');

/** Id numérico de la URL (`/recurso/:id`). Un id que no es número responde 404, no un error 500. */
function idParam(req, nombre = 'id') {
  const id = Number(req.params[nombre]);
  if (!Number.isSafeInteger(id) || id <= 0) throw notFound();
  return id;
}

module.exports = { idParam };
