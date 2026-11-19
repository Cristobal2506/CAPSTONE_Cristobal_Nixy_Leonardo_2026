// v16 — Preprocesamiento de la escritura a mano (estilo OpenCV, hecho directamente sobre los trazos).
// Entrada: trazos capturados en el lienzo [[ [x,y], [x,y], ... ], ...] en coordenadas del lienzo.
// Salida: caracteres separados y, por cada dígito, una imagen 28x28 normalizada como MNIST
// (caja de 20x20 que conserva la proporción y centro de masa en el píxel 14,14).
//
// Como el lienzo entrega los trazos como vectores, la segmentación se hace por trazos y no por
// "componentes conexas" sobre una foto: es más exacta (un 4 de dos trazos sigue siendo un 4)
// y no depende de iluminación, sombras ni grosor.

const LADO = 28, CAJA = 20, RADIO = 1.15; // grosor ≈ 2,3 px a 28x28, similar a MNIST

function cajaDe(puntos) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of puntos) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, ancho: x1 - x0, alto: y1 - y0 };
}
const unir = (a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1),
  get ancho() { return this.x1 - this.x0; }, get alto() { return this.y1 - this.y0; } });

// Agrupa trazos en caracteres según cuánto se superponen en el eje horizontal.
function segmentar(trazos) {
  const validos = trazos.filter((t) => t.length > 0);
  if (!validos.length) return { grupos: [], altoLinea: 0 };
  const total = cajaDe(validos.flat());
  const altoLinea = Math.max(total.alto, 1);
  const minAncho = altoLinea * 0.18; // un "1" o un punto no tienen ancho: se les da un mínimo
  const items = validos.map((t) => ({ trazos: [t], caja: cajaDe(t) })).sort((a, b) => a.caja.x0 - b.caja.x0);
  const solapa = (a, b) => {
    const aw = Math.max(a.ancho, minAncho), bw = Math.max(b.ancho, minAncho);
    const acx = (a.x0 + a.x1) / 2, bcx = (b.x0 + b.x1) / 2;
    const ov = Math.min(acx + aw / 2, bcx + bw / 2) - Math.max(acx - aw / 2, bcx - bw / 2);
    return ov / Math.min(aw, bw);
  };
  let grupos = [];
  for (const it of items) {
    let mejor = null, mejorOv = 0.45;
    for (const g of grupos) { const ov = solapa(g.caja, it.caja); if (ov > mejorOv) { mejor = g; mejorOv = ov; } }
    if (mejor) { mejor.trazos.push(...it.trazos); mejor.caja = unir(mejor.caja, it.caja); }
    else grupos.push({ trazos: [...it.trazos], caja: it.caja });
  }
  // segunda pasada: grupos que quedaron superpuestos al crecer
  let cambio = true;
  while (cambio) {
    cambio = false;
    outer: for (let i = 0; i < grupos.length; i++) for (let j = i + 1; j < grupos.length; j++) {
      if (solapa(grupos[i].caja, grupos[j].caja) > 0.6) {
        grupos[i].trazos.push(...grupos[j].trazos); grupos[i].caja = unir(grupos[i].caja, grupos[j].caja);
        grupos.splice(j, 1); cambio = true; break outer;
      }
    }
  }
  grupos.sort((a, b) => a.caja.x0 - b.caja.x0);
  // Altura típica de un dígito: mediana de los grupos que no son diminutos.
  const altos = grupos.map((g) => Math.max(g.caja.alto, g.caja.ancho)).sort((a, b) => a - b);
  const mediana = altos[Math.floor(altos.length / 2)] || altoLinea;
  const ref = Math.max(mediana, altoLinea * 0.6);
  for (const g of grupos) {
    const tam = Math.max(g.caja.alto, g.caja.ancho);
    const cy = (g.caja.y0 + g.caja.y1) / 2;
    // Coma o punto decimal: marca pequeña en la mitad inferior de la línea.
    g.separador = grupos.length > 1 && tam < ref * 0.3 && cy > total.y0 + altoLinea * 0.5;
    g.diminuto = !g.separador && tam < ref * 0.18; // una mancha accidental
  }
  return { grupos, altoLinea };
}

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + t * dx - px, qy = ay + t * dy - py; return Math.sqrt(qx * qx + qy * qy);
}
function pintar(segs, dx, dy) {
  const img = new Float32Array(LADO * LADO);
  for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
    const px = x + 0.5 - dx, py = y + 0.5 - dy; let d = Infinity;
    for (const s of segs) { const v = distSeg(px, py, s[0], s[1], s[2], s[3]); if (v < d) d = v; }
    const v = RADIO + 0.5 - d; img[y * LADO + x] = v <= 0 ? 0 : v >= 1 ? 1 : v;
  }
  return img;
}
// Convierte un grupo de trazos a la imagen 28x28 (fondo 0, tinta 1).
function rasterizar(trazos) {
  const caja = cajaDe(trazos.flat());
  const lado = Math.max(caja.ancho, caja.alto, 1e-6);
  const esc = (CAJA - 2 * RADIO) / lado;
  const ox = (LADO - caja.ancho * esc) / 2, oy = (LADO - caja.alto * esc) / 2;
  const segs = [];
  for (const t of trazos) {
    const p = t.map(([x, y]) => [(x - caja.x0) * esc + ox, (y - caja.y0) * esc + oy]);
    if (p.length === 1) segs.push([p[0][0], p[0][1], p[0][0], p[0][1]]);
    for (let i = 1; i < p.length; i++) segs.push([p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]]);
  }
  // centro de masa en (14,14), igual que en MNIST
  const img = pintar(segs, 0, 0);
  let m = 0, mx = 0, my = 0;
  for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) { const v = img[y * LADO + x]; m += v; mx += v * (x + 0.5); my += v * (y + 0.5); }
  if (!m) return img;
  let dx = 14 - mx / m, dy = 14 - my / m;
  const lim = 4; dx = Math.max(-lim, Math.min(lim, dx)); dy = Math.max(-lim, Math.min(lim, dy));
  return pintar(segs, dx, dy);
}

// Reduce puntos muy cercanos (el lienzo puede mandar cientos por trazo).
function simplificar(trazo, minDist) {
  if (trazo.length <= 2) return trazo;
  const out = [trazo[0]];
  for (let i = 1; i < trazo.length - 1; i++) {
    const [x, y] = trazo[i], [lx, ly] = out[out.length - 1];
    if (Math.hypot(x - lx, y - ly) >= minDist) out.push(trazo[i]);
  }
  out.push(trazo[trazo.length - 1]);
  return out;
}

// Imagen como texto (para depurar en consola): node -e "..."
const ascii = (img) => Array.from({ length: LADO }, (_, y) =>
  Array.from({ length: LADO }, (_, x) => ' .:-=+*#%@'[Math.min(9, Math.floor(img[y * LADO + x] * 10))]).join('')).join('\n');

module.exports = { segmentar, rasterizar, simplificar, cajaDe, ascii, LADO };
