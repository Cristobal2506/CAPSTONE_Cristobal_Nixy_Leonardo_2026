// v16 — Reconocimiento de números escritos a mano (dedo o lápiz) en el servidor.
// Modelo: red convolucional entrenada con MNIST (modelos/digitos.onnx), ejecutada con
// ONNX Runtime (paquete onnxruntime-web, sin binarios nativos: funciona igual en Windows, macOS y Linux),
// en un hilo aparte (modelo-worker.js).
// El alumno SIEMPRE confirma lo que se leyó antes de guardar la respuesta: un error del reconocedor
// nunca se convierte en una respuesta incorrecta sin que el alumno lo vea.
const path = require('path');
const { Worker } = require('worker_threads');
const { segmentar, rasterizar, simplificar, cajaDe, LADO } = require('./trazos');

const RUTA_MODELO = process.env.MODELO_DIGITOS || path.join(__dirname, '../../../modelos/digitos.onnx');
const CONFIANZA_DUDOSA = 0.7;
let hilo = null, listo = null, siguiente = 1;
const pendientes = new Map();

// Inicia (una vez) el hilo del modelo y espera a que cargue.
function cargarModelo() {
  if (listo) return listo;
  hilo = new Worker(path.join(__dirname, 'modelo-worker.js'), { workerData: { rutaModelo: RUTA_MODELO } });
  listo = new Promise((resolve, reject) => {
    hilo.on('message', (m) => {
      if (m.listo) { if (!pendientes.size) hilo.unref(); return resolve(); }
      if (m.errorCarga) return reject(new Error('No se pudo cargar el modelo de dígitos: ' + m.errorCarga));
      const p = pendientes.get(m.id); if (!p) return;
      pendientes.delete(m.id);
      if (!pendientes.size) hilo.unref(); // ocioso: no impide que el proceso termine
      m.error ? p.reject(new Error(m.error)) : p.resolve(m.logits);
    });
    hilo.on('error', (e) => { reject(e); for (const p of pendientes.values()) p.reject(e); pendientes.clear(); });
    hilo.on('exit', () => { hilo = null; listo = null; });
  });
  listo.catch(() => { listo = null; });
  return listo;
}
async function cerrar() { if (hilo) await hilo.terminate(); hilo = null; listo = null; }

function softmax(v) {
  const m = Math.max(...v); const e = v.map((x) => Math.exp(x - m)); const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

async function clasificar(imagenes) {
  if (!imagenes.length) return [];
  await cargarModelo();
  const datos = new Float32Array(imagenes.length * LADO * LADO);
  imagenes.forEach((img, i) => datos.set(img, i * LADO * LADO));
  const id = siguiente++;
  const logits = await new Promise((resolve, reject) => {
    pendientes.set(id, { resolve, reject });
    hilo.ref(); // mientras haya lecturas en curso, el proceso espera la respuesta
    hilo.postMessage({ id, datos, n: imagenes.length, lado: LADO });
  });
  return imagenes.map((_, i) => {
    const p = softmax(Array.from(logits.slice(i * 10, i * 10 + 10)));
    const orden = p.map((c, d) => ({ valor: String(d), confianza: c })).sort((a, b) => b.confianza - a.confianza);
    return orden;
  });
}

// formato: 'entero' (solo dígitos) o 'decimal' (permite una coma).
async function reconocerNumero(trazosEntrada, { formato = 'entero' } = {}) {
  const total = cajaDe(trazosEntrada.flat());
  const trazos = trazosEntrada.map((t) => simplificar(t, Math.max(total.alto, total.ancho, 1) * 0.01));
  const { grupos } = segmentar(trazos);
  // Una marca pequeña abajo (coma o punto) es separador decimal; en un número entero se ignora.
  const digitos = grupos.filter((g) => !g.diminuto && !g.separador);
  const probs = await clasificar(digitos.map((g) => rasterizar(g.trazos)));
  const caracteres = [];
  let k = 0, separadores = 0;
  for (const g of grupos) {
    if (g.diminuto) continue;
    if (g.separador) {
      if (formato !== 'decimal') continue;
      // solo una coma y nunca al inicio ni al final
      if (separadores === 0 && caracteres.length) { caracteres.push({ tipo: 'separador', valor: ',' }); separadores++; }
      continue;
    }
    const orden = probs[k++];
    caracteres.push({
      tipo: 'digito', valor: orden[0].valor, confianza: Number(orden[0].confianza.toFixed(3)),
      alternativas: orden.slice(1, 3).map((a) => ({ valor: a.valor, confianza: Number(a.confianza.toFixed(3)) })),
      caja: { x: g.caja.x0, y: g.caja.y0, ancho: g.caja.ancho, alto: g.caja.alto },
    });
  }
  if (caracteres.at(-1)?.tipo === 'separador') caracteres.pop();
  const ds = caracteres.filter((c) => c.tipo === 'digito');
  const confianza = ds.length ? Math.min(...ds.map((d) => d.confianza)) : 0;
  return {
    texto: caracteres.map((c) => c.valor).join(''),
    caracteres,
    confianza: Number(confianza.toFixed(3)),
    dudoso: !ds.length || confianza < CONFIANZA_DUDOSA,
  };
}

module.exports = { reconocerNumero, clasificar, cargarModelo, cerrar, CONFIANZA_DUDOSA };
