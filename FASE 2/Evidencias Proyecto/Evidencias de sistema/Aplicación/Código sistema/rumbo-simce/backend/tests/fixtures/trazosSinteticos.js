// Generador de trazos sintéticos "como los de un niño" para probar el reconocedor de punta a punta.
// Cada dígito tiene plantillas de trazos en una caja 0..1 (x hacia la derecha, y hacia abajo);
// se deforman con rotación, inclinación, escala, temblor y espaciado aleatorios.
const arco = (cx, cy, rx, ry, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + (a1 - a0) * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
});
const PI = Math.PI;
const PLANTILLAS = {
  0: [[arco(0.5, 0.5, 0.36, 0.48, -PI / 2, 1.5 * PI + 0.2, 28)]],
  1: [[[[0.5, 0], [0.5, 1]]], [[[0.25, 0.22], [0.55, 0], [0.55, 1]]]],
  2: [[[...arco(0.5, 0.3, 0.35, 0.3, PI * 1.05, PI * 2.15, 14), [0.12, 1], [0.92, 1]]]],
  3: [[[...arco(0.48, 0.27, 0.33, 0.25, PI * 1.1, PI * 2.5, 12), ...arco(0.48, 0.73, 0.38, 0.27, -PI * 0.5, PI * 0.9, 14)]]],
  4: [[[[0.62, 0], [0.08, 0.68], [0.95, 0.68]], [[0.68, 0.3], [0.68, 1]]], [[[0.2, 0], [0.15, 0.6], [0.9, 0.6]], [[0.7, 0], [0.7, 1]]]],
  5: [[[[0.82, 0], [0.25, 0], [0.2, 0.42], ...arco(0.48, 0.68, 0.38, 0.32, -PI * 0.75, PI * 0.85, 14)]],
      [[[0.25, 0], [0.2, 0.42], ...arco(0.48, 0.68, 0.38, 0.32, -PI * 0.75, PI * 0.85, 14)], [[0.25, 0], [0.85, 0]]]],
  6: [[[[0.72, 0], [0.45, 0.14], [0.25, 0.38], ...arco(0.5, 0.72, 0.36, 0.28, PI, -PI * 0.9, 22)]]],
  7: [[[[0.08, 0], [0.92, 0], [0.4, 1]]], [[[0.08, 0], [0.92, 0], [0.4, 1]], [[0.3, 0.5], [0.8, 0.5]]]],
  8: [[[...arco(0.5, 0.25, 0.28, 0.25, PI * 0.5, PI * 2.5, 18), ...arco(0.5, 0.74, 0.36, 0.26, -PI * 0.5, PI * 1.5, 18)]]],
  9: [[[...arco(0.5, 0.3, 0.34, 0.3, 0.1, PI * 2.1, 20), [0.82, 0.45], [0.72, 1]]]],
};

function rng(semilla) { let s = semilla >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

// Devuelve los trazos de un número (p. ej. "305" o "3,5") en coordenadas de un lienzo ~600x200.
function trazosDeNumero(texto, semilla = 1, { alto = 120, temblor = 0.025 } = {}) {
  const r = rng(semilla), out = [];
  let x = 30 + r() * 20;
  const base = 40 + r() * 20;
  for (const ch of texto) {
    if (ch === ',') {
      out.push(Array.from({ length: 5 }, (_, i) => [x - 8 + i * 1.5, base + alto * (0.92 + i * 0.05)]));
      x += alto * 0.25; continue;
    }
    const variantes = PLANTILLAS[ch];
    const tr = variantes[Math.floor(r() * variantes.length)];
    const ang = (r() * 2 - 1) * 0.18, inc = (r() * 2 - 1) * 0.25;
    const h = alto * (0.85 + r() * 0.3), w = h * (0.55 + r() * 0.25), dy = (r() * 2 - 1) * alto * 0.08;
    for (const t of tr) {
      const pts = t.map(([u, v]) => {
        u += (r() * 2 - 1) * temblor; v += (r() * 2 - 1) * temblor;
        let px = (u - 0.5) * w + inc * (0.5 - v) * h, py = (v - 0.5) * h;
        const qx = px * Math.cos(ang) - py * Math.sin(ang), qy = px * Math.sin(ang) + py * Math.cos(ang);
        return [x + w / 2 + qx, base + alto / 2 + dy + qy];
      });
      out.push(pts);
    }
    x += w + alto * (0.12 + r() * 0.25);
  }
  return out;
}
module.exports = { trazosDeNumero, PLANTILLAS };
