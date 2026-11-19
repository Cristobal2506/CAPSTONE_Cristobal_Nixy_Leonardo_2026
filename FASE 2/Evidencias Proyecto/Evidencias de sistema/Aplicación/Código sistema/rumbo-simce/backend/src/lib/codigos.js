const crypto = require('crypto');

// Sin 0/O/1/I/L para que un niño no los confunda al escribir su código.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generarCodigo(largo = 6) {
  const bytes = crypto.randomBytes(largo);
  let out = '';
  for (let i = 0; i < largo; i++) out += ALFABETO[bytes[i] % ALFABETO.length];
  return out;
}

/** Inserta reintentando si el código aleatorio choca con uno existente (UNIQUE). */
async function conCodigoUnico(intentar, maxIntentos = 5) {
  for (let i = 0; i < maxIntentos; i++) {
    try {
      return await intentar(generarCodigo());
    } catch (err) {
      if (err.code !== '23505' || i === maxIntentos - 1) throw err; // 23505 = unique_violation
    }
  }
}

module.exports = { generarCodigo, conCodigoUnico, ALFABETO };
