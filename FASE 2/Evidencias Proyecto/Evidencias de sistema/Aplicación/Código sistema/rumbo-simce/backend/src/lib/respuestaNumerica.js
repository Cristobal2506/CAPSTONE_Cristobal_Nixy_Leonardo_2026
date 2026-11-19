// v16 — Respuestas numéricas escritas (diagnóstico, pruebas de unidad y ensayo).
// Notación chilena: coma decimal ("3,5") y punto de miles ("3.456").
// Formatos de respuesta: 'entero' | 'decimal' | 'fraccion' (se escribe "numerador/denominador").

const RE = {
  entero: /^\d{1,9}$/,
  decimal: /^\d{1,9}(,\d{1,6})?$/,
  fraccion: /^\d{1,6}\/\d{1,6}$/,
};

// Normaliza lo que llega desde la app (ya confirmado por el alumno).
function normalizar(texto, formato) {
  if (texto == null) return null;
  let t = String(texto).trim().replace(/\s+/g, '');
  if (formato === 'decimal') t = t.replace('.', ',');
  if (formato === 'fraccion') t = t.replace(/[÷:]/g, '/');
  if (!RE[formato]?.test(t)) return null;
  if (formato === 'entero') return String(Number(t));
  if (formato === 'decimal') {
    let [e, d] = t.split(',');
    e = String(Number(e)); d = (d || '').replace(/0+$/, '');
    return d ? `${e},${d}` : e;
  }
  const [n, den] = t.split('/').map(Number);
  return `${n}/${den}`;
}

const mcd = (a, b) => (b ? mcd(b, a % b) : a);
// Valor exacto como fracción [numerador, denominador] para comparar sin errores de coma flotante.
function valor(texto, formato) {
  const t = normalizar(texto, formato);
  if (t == null) return null;
  let n, d;
  if (formato === 'fraccion') { [n, d] = t.split('/').map(Number); if (!d) return null; }
  else if (t.includes(',')) { const [e, f] = t.split(','); d = 10 ** f.length; n = Number(e) * d + Number(f); }
  else { n = Number(t); d = 1; }
  const g = mcd(n, d) || 1; return [n / g, d / g];
}

// formaExacta: la fracción debe escribirse igual (p. ej. "simplifica 6/8" exige 3/4).
// Si no, se acepta cualquier fracción equivalente (3/4 = 6/8).
function esCorrecta(respuesta, esperada, formato, formaExacta = false) {
  if (respuesta == null || esperada == null) return false;
  if (formaExacta) return normalizar(respuesta, formato) === normalizar(esperada, formato);
  const a = valor(respuesta, formato), b = valor(esperada, formato);
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

// Deduce el formato a partir del texto de la alternativa correcta (para migrar el banco).
// Devuelve null si la respuesta no es numérica: esas preguntas se mantienen con alternativas.
function deducir(textoCorrecto) {
  const t = String(textoCorrecto ?? '').trim();
  const m = t.match(/^(\$\s?)?([\d.,/ ]+?)\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ²³°%]{1,12}(?:\s[a-zA-Záéíóúñ²³]{1,8})?)?$/);
  if (!m) return null;
  let num = m[2].replace(/\s/g, '');
  const prefijo = m[1] ? '$' : null, sufijo = m[3] || null;
  if (/^\d{1,3}(\.\d{3})+$/.test(num)) num = num.replace(/\./g, ''); // 3.456 → 3456
  if (RE.entero.test(num)) return { formato: 'entero', respuesta: String(Number(num)), prefijo, sufijo };
  if (/^\d+,\d+$/.test(num)) return { formato: 'decimal', respuesta: normalizar(num, 'decimal'), prefijo, sufijo };
  if (RE.fraccion.test(num)) return { formato: 'fraccion', respuesta: normalizar(num, 'fraccion'), prefijo, sufijo };
  return null;
}

module.exports = { normalizar, valor, esCorrecta, deducir, FORMATOS: Object.keys(RE) };
