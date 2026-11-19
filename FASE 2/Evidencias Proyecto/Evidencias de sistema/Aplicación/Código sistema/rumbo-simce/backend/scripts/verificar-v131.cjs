// Verificacion offline; no requiere npm install ni conexion a PostgreSQL.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const preguntas=require('./banco-diagnostico-v131.json');
assert.equal(preguntas.length,40,'El diagnostico v13.1 debe tener 40 preguntas');
assert.equal(new Set(preguntas.map(q=>q.codigo)).size,40);
assert.equal(new Set(preguntas.map(q=>q.habilidad)).size,40,'Revisar tareas cognitivas repetidas');
assert.equal(new Set(preguntas.map(q=>q.enunciado.toLowerCase())).size,40);
for(let unit=1;unit<=5;unit++)assert.equal(preguntas.filter(q=>q.unidad===unit).length,8,`Unidad ${unit}`);
const oas=new Set(preguntas.map(q=>q.oa));
for(const oa of [1,3,5,6,7,8,9,13,14,17,18,22,23,27])assert(oas.has('OA'+oa),'Falta OA'+oa);
for(const q of preguntas){
 assert.equal(q.opciones.length,4,q.codigo);
 assert.equal(new Set(q.opciones.map(o=>o.texto)).size,4,q.codigo);
 assert(q.opciones.some(o=>o.clave===q.respuesta_correcta && o.texto===q.respuesta),q.codigo);
 assert(!q.enunciado.includes('dígito 0'),q.codigo);
}
const seed=fs.readFileSync(path.join(root,'seeds/007_diagnostico_unico_v131.sql'),'utf8');
assert.equal((seed.match(/INSERT INTO evaluacion_pregunta\(/g)||[]).length,40);
assert.equal((seed.match(/INSERT INTO pregunta\(/g)||[]).length,40);
const migration=fs.readFileSync(path.join(root,'migrations/011_diagnostico_v131.sql'),'utf8');
assert(migration.includes('DIAG-INICIAL-V131')&&migration.includes("activa=FALSE"));
const routes=fs.readFileSync(path.join(root,'src/routes/evaluaciones.js'),'utf8');
assert(routes.includes('i.entregado_en IS NULL')&&routes.includes('ORDER BY id DESC'));
const notifs=fs.readFileSync(path.join(root,'src/routes/notificaciones.js'),'utf8');
assert(notifs.includes('apoderado_id'));
const rev=fs.readFileSync(path.join(root,'src/lib/evaluaciones.js'),'utf8');
assert(rev.includes('INSERT INTO notificacion(apoderado_id'));
console.log('OK: 40 planteamientos distintos, cinco unidades, 14 OA, clave y distractores coherentes, versionado y avisos a apoderado.');
console.log('Validación de contenido/estructura: no sustituye la revisión pedagógica ni las pruebas PostgreSQL.');
