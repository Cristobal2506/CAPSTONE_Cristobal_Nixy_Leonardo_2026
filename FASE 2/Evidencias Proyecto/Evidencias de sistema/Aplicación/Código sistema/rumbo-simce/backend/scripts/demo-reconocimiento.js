// v16 — Demostración independiente del reconocedor (no usa base de datos ni sesión).
// Uso:  npm run demo:reconocimiento   y abre en la tablet  http://IP-DEL-PC:3100
// Sirve para probar la lectura de números con el dedo o el lápiz antes de rendir una prueba.
const path = require('path');
const express = require('express');
const { reconocerNumero, cargarModelo } = require('../src/lib/reconocimiento');
const esquema = require('../src/lib/reconocimiento/esquema');

const app = express();
app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, '../public/pizarra.html')));
app.post('/reconocer', async (req, res) => {
  const t = esquema.trazos.safeParse(req.body?.trazos);
  if (!t.success) return res.status(400).json({ error: 'Trazos inválidos' });
  const formato = req.body?.formato === 'decimal' ? 'decimal' : 'entero';
  const ini = Date.now();
  const lectura = await reconocerNumero(t.data, { formato });
  res.json({ lectura, ms: Date.now() - ini });
});
const PUERTO = Number(process.env.PUERTO_DEMO || 3100);
cargarModelo().then(() => app.listen(PUERTO, '0.0.0.0', () => {
  const ips = Object.values(require('os').networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`Demo de reconocimiento lista: http://localhost:${PUERTO}`);
  for (const ip of ips) console.log(`  desde la tablet: http://${ip}:${PUERTO}`);
}));
