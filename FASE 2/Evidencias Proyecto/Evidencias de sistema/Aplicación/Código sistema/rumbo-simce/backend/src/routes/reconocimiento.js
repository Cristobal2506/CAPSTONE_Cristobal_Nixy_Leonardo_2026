// v16 — POST /api/reconocimiento/numero
// Lee un número escrito a mano. No guarda nada: la respuesta se guarda recién cuando el alumno
// confirma la lectura (PUT /api/evaluaciones/intentos/:id/respuesta).
const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { reconocerNumero } = require('../lib/reconocimiento');
const esquema = require('../lib/reconocimiento/esquema');

const router = express.Router();
router.use(requireAuth);

router.post('/numero', validate(z.object({
  trazos: esquema.trazos,
  formato: z.enum(['entero', 'decimal']).default('entero'),
})), async (req, res) => {
  const lectura = await reconocerNumero(req.body.trazos, { formato: req.body.formato });
  // No se devuelven las cajas internas: solo lo que la app necesita mostrar.
  res.json({ lectura: { ...lectura, caracteres: lectura.caracteres.map(({ caja, ...c }) => c) } });
});

module.exports = router;
