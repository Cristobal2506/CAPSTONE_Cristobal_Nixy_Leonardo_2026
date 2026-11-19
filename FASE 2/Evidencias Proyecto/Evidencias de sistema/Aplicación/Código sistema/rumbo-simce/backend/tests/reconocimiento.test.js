// v16 — Reconocimiento de números escritos a mano y corrección numérica (sin base de datos).
// npm run test:reconocimiento
const { reconocerNumero, clasificar } = require('../src/lib/reconocimiento');
const { segmentar } = require('../src/lib/reconocimiento/trazos');
const numerica = require('../src/lib/respuestaNumerica');
const { trazosDeNumero } = require('./fixtures/trazosSinteticos');
const esquema = require('../src/lib/reconocimiento/esquema');

jest.setTimeout(60000);
afterAll(() => require('../src/lib/reconocimiento').cerrar());

test('lee cada dígito escrito a mano (600 muestras sintéticas, ≥ 97 %)', async () => {
  let ok = 0;
  for (let s = 1; s <= 60; s++) for (let d = 0; d < 10; d++) {
    if ((await reconocerNumero(trazosDeNumero(String(d), s * 31 + d))).texto === String(d)) ok++;
  }
  expect(ok / 600).toBeGreaterThanOrEqual(0.97);
});

test('lee números de varias cifras y separa los dígitos aunque un 4 tenga dos trazos', async () => {
  let ok = 0;
  const casos = ['4', '47', '305', '1024', '9876', '44', '1111', '2580', '63', '700'];
  for (const [i, t] of casos.entries()) if ((await reconocerNumero(trazosDeNumero(t, 300 + i))).texto === t) ok++;
  expect(ok).toBeGreaterThanOrEqual(9);
  const g = segmentar(trazosDeNumero('44', 2)).grupos.filter((x) => !x.diminuto);
  expect(g).toHaveLength(2);
});

test('reconoce la coma decimal solo cuando el formato es decimal', async () => {
  const d = await reconocerNumero(trazosDeNumero('3,5', 11), { formato: 'decimal' });
  expect(d.texto).toBe('3,5');
  expect(d.caracteres.map((c) => c.tipo)).toEqual(['digito', 'separador', 'digito']);
  const e = await reconocerNumero(trazosDeNumero('3,5', 11), { formato: 'entero' });
  expect(e.texto).toBe('35'); // en un entero la marca pequeña se ignora
});

test('marca como dudosa una lectura poco segura y entrega alternativas', async () => {
  const garabato = [[[0, 0], [40, 80], [80, 0], [0, 80], [80, 80], [10, 10]]];
  const r = await reconocerNumero(garabato);
  expect(r.caracteres[0].alternativas).toHaveLength(2);
  expect(typeof r.dudoso).toBe('boolean');
  expect(await clasificar([])).toEqual([]);
});

test('valida el tamaño de los trazos', () => {
  expect(esquema.trazos.safeParse([[[1, 2]]]).success).toBe(true);
  expect(esquema.trazos.safeParse([]).success).toBe(false);
  expect(esquema.trazos.safeParse(Array(41).fill([[1, 1]])).success).toBe(false);
  expect(esquema.trazos.safeParse([[['a', 2]]]).success).toBe(false);
});

test('corrige respuestas numéricas por su valor (notación chilena)', () => {
  expect(numerica.esCorrecta('3456', '3456', 'entero')).toBe(true);
  expect(numerica.esCorrecta('03456', '3456', 'entero')).toBe(true);
  expect(numerica.esCorrecta('3,50', '3,5', 'decimal')).toBe(true);
  expect(numerica.esCorrecta('3.5', '3,5', 'decimal')).toBe(true);
  expect(numerica.esCorrecta('6/8', '3/4', 'fraccion')).toBe(true);
  expect(numerica.esCorrecta('6/8', '3/4', 'fraccion', true)).toBe(false); // «simplifica» exige 3/4
  expect(numerica.esCorrecta('3/0', '3/4', 'fraccion')).toBe(false);
  expect(numerica.normalizar('12a', 'entero')).toBeNull();
  expect(numerica.deducir('3.456')).toMatchObject({ formato: 'entero', respuesta: '3456' });
  expect(numerica.deducir('45 cm')).toMatchObject({ formato: 'entero', respuesta: '45', sufijo: 'cm' });
  expect(numerica.deducir('$ 1.200')).toMatchObject({ formato: 'entero', respuesta: '1200', prefijo: '$' });
  expect(numerica.deducir('82/100')).toMatchObject({ formato: 'fraccion' });
  expect(numerica.deducir('Cono')).toBeNull();
});
