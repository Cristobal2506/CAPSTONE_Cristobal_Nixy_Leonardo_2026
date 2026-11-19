// v16 — Validación de los trazos que envía la app (tamaño acotado para no superar el límite de express.json).
const { z } = require('zod');
const punto = z.tuple([z.number().finite().min(-50).max(5000), z.number().finite().min(-50).max(5000)]);
const trazo = z.array(punto).min(1).max(800);
const trazos = z.array(trazo).min(1).max(40)
  .refine((t) => t.reduce((n, x) => n + x.length, 0) <= 4000, 'Demasiados puntos en el dibujo.');
module.exports = { trazos, punto, trazo };
