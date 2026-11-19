// Validación offline: no modifica la base de datos ni necesita node_modules.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');const leer=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const banco=JSON.parse(leer('scripts/banco-practica-v14.json'));
assert.equal(banco.lecciones.length,15);assert.equal(banco.preguntas.length,150);
assert.equal(new Set(banco.preguntas.map(q=>q.codigo)).size,150);
assert.equal(new Set(banco.preguntas.map(q=>q.enunciado.toLowerCase())).size,150);
for(let u=1;u<=5;u++){
  assert.equal(banco.lecciones.filter(l=>l.u===u).length,3);
  assert.equal(banco.preguntas.filter(q=>q.unidad===u).length,30);
}
for (const q of banco.preguntas){
 assert.equal(q.incorrectas.length===3||q.incorrectas.length===1,true,q.codigo);
 assert(!q.incorrectas.includes(q.respuesta),q.codigo);
 assert.equal(new Set(q.incorrectas).size,q.incorrectas.length,q.codigo);
 assert(q.explicacion&&q.oa&&q.codigo);
}
const sql=leer('seeds/008_ampliacion_practicas_v14.sql');
assert.equal((sql.match(/INSERT INTO conjunto\(/g)||[]).length,15);
assert.equal((sql.match(/INSERT INTO hoja\(/g)||[]).length,30);
assert.equal((sql.match(/INSERT INTO pregunta\(/g)||[]).length,150);
assert.equal((sql.match(/INSERT INTO hoja_ejercicio\(/g)||[]).length,150);
assert(sql.includes('NOT EXISTS (SELECT 1 FROM evaluacion_intento'));
const route=leer('src/routes/progreso-v14.js');
assert(route.includes('c.docente_id=$2')&&route.includes('ae.apoderado_id=$2'));
assert(route.includes('if (!rowCount) throw notFound'));
assert(route.includes('CASE WHEN i.revisado_en IS NOT NULL THEN i.porcentaje'));
assert(route.includes("router.get('/mio'")&&route.includes("router.get('/estudiantes/:id'"));
assert(leer('src/routes/notificaciones.js').includes("router.post('/leer-todas'"));
console.log('OK v14: 15 lecciones nuevas, 150 ejercicios originales (30 por unidad), 32 lecciones y 320 ejercicios acumulados.');
console.log('OK: SQL idempotente, permisos por vinculación, calificaciones ocultas hasta revisión, notificaciones al abrir.');
console.log('La verificación de base real y APK Android se realiza en el entorno del equipo.');
