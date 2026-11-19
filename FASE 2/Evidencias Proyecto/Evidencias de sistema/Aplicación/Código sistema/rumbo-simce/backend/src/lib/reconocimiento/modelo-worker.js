// v16 — Hilo aparte que ejecuta el modelo ONNX (onnxruntime-web, backend WebAssembly).
// Corre fuera del hilo principal para no bloquear la API, y fuera del entorno de Jest
// (Jest no permite los import() dinámicos que usa ONNX Runtime).
const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const ort = require('onnxruntime-web');
ort.env.wasm.numThreads = 1;
ort.env.logLevel = 'error';

const sesion = ort.InferenceSession.create(fs.readFileSync(workerData.rutaModelo));
sesion.then(() => parentPort.postMessage({ listo: true }), (e) => parentPort.postMessage({ errorCarga: String(e?.message || e) }));

parentPort.on('message', async ({ id, datos, n, lado }) => {
  try {
    const s = await sesion;
    const out = await s.run({ imagen: new ort.Tensor('float32', datos, [n, 1, lado, lado]) });
    parentPort.postMessage({ id, logits: Float32Array.from(out.logits.data) });
  } catch (e) {
    parentPort.postMessage({ id, error: String(e?.message || e) });
  }
});
