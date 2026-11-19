// Verificacion offline sin npm install: datos fuente y caracteristicas vitales del backend.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..');
const banco=require('./banco-v13-validacion.json');
const seeds=fs.readFileSync(path.join(base,'seeds/006_ajustes_pedagogicos_v13.sql'),'utf8');
const evals=fs.readFileSync(path.join(base,'src/lib/evaluaciones.js'),'utf8');
const migration=fs.readFileSync(path.join(base,'migrations/010_diagnostico_revision_notificaciones_v13.sql'),'utf8');
assert.equal(banco.length,270);assert(seeds.includes('3000'));assert(seeds.includes('3600'));
for(let unit=1;unit<=5;unit++)assert.equal((seeds.match(new RegExp(`codigo='EVAL-U${unit}'\\)`, 'g'))||[]).length,13);
assert.equal((seeds.match(/codigo='DIAG-INICIAL'\)/g)||[]).length,40);
for(const q of banco){
 assert(q.options.some(o=>o.clave===q.key),q.code);
 if(/¿Cuál es el mayor número entre/.test(q.enunciado)){
  const m=q.enunciado.match(/entre ([\d.]+) y ([\d.]+)\?/);assert(m,q.code);
  assert.deepEqual(q.options.map(o=>o.texto),[m[1],m[2]]);
 }
 if(/¿cuánto vale el dígito/.test(q.enunciado)){
  assert(!q.enunciado.includes('dígito 0'),q.code);
  assert.match(q.enunciado,/\[\[[1-9]\]\]/,q.code);
 }
}
assert(evals.includes('estadoDiagnostico'));assert(evals.includes('observacion.trim()'));
assert(evals.includes('r.revisado_en ? r.correctas : null'));
assert(migration.includes('unidad_omitida_diagnostico'));
console.log('OK: 270 preguntas, correcciones de enunciados, +13 por unidad, diagnostico 40, revision privada y base de datos.');
