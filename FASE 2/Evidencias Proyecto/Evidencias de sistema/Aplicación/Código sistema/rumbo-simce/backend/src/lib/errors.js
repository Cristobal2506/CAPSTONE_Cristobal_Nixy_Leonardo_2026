class HttpError extends Error {
  /** `extra` se agrega al cuerpo del error (ej: { reintentarEnMinutos: 12 }). */
  constructor(status, message, code, extra) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const badRequest = (msg, code = 'SOLICITUD_INVALIDA') => new HttpError(400, msg, code);
const unauthorized = (msg = 'No autenticado', code = 'NO_AUTENTICADO') => new HttpError(401, msg, code);
const forbidden = (msg = 'No autorizado', code = 'NO_AUTORIZADO') => new HttpError(403, msg, code);
const notFound = (msg = 'No encontrado', code = 'NO_ENCONTRADO') => new HttpError(404, msg, code);
const conflict = (msg, code = 'CONFLICTO') => new HttpError(409, msg, code);
const locked = (msg, extra) => new HttpError(423, msg, 'CUENTA_BLOQUEADA', extra);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, locked };
