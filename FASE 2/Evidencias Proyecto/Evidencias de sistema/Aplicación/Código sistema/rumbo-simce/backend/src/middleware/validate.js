const { badRequest } = require('../lib/errors');

/** Valida req.body con un esquema zod y deja el resultado limpio en req.body. */
const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const detalle = result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    return next(badRequest(detalle, 'VALIDACION'));
  }
  req.body = result.data;
  next();
};

module.exports = { validate };
