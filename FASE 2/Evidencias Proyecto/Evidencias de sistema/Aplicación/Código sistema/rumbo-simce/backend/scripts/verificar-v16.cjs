// Verificador offline v16 (no necesita base de datos): npm run verificar:v16
const fs=require('fs'),path=require('path');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const errores=[];const ok=(c,m)=>{if(!c)errores.push(m);};
ok(fs.existsSync(path.join(raiz,'modelos/digitos.onnx')),'falta modelos/digitos.onnx');
const lib=leer('src/lib/evaluaciones.js');
ok(/esEscrita/.test(lib)&&/respuesta_texto/.test(lib),'lib/evaluaciones.js no maneja respuestas escritas');
const hacer=lib.slice(lib.indexOf('async function pruebaParaHacer'),lib.indexOf('async function iniciar'));
ok(!/respuesta_numerica:|respuestaNumerica:/.test(hacer),'pruebaParaHacer no debe enviar la respuesta correcta al alumno');
ok(/requireAuth/.test(leer('src/routes/reconocimiento.js')),'la ruta de reconocimiento debe exigir sesión');
const mig=leer('migrations/013_respuesta_escrita_v16.sql'),seed=leer('seeds/010_respuesta_escrita_v16.sql');
ok(/ADD COLUMN IF NOT EXISTS formato_respuesta/.test(mig)&&/ADD COLUMN IF NOT EXISTS respuesta_texto/.test(mig),'migración 013 incompleta');
ok(/respuesta_escrita = TRUE/.test(seed)&&/formato_respuesta = CASE/.test(seed),'semilla 010 incompleta');
ok(/opcion:z\.enum.*optional\(\)/s.test(leer('src/routes/evaluaciones.js'))&&/respuesta:z\.string/.test(leer('src/routes/evaluaciones.js')),'la ruta de respuesta debe aceptar alternativa o número escrito');
const server=leer('src/app.js');
ok(/reconocimiento/.test(server),'monta la ruta en el servidor: app.use(\'/api/reconocimiento\', require(\'./routes/reconocimiento\'))');
if(errores.length){console.error('FALLA v16:\n- '+errores.join('\n- '));process.exit(1);}
console.log('OK v16: modelo presente, respuesta escrita en evaluaciones, sin fuga de la respuesta correcta y lector protegido por sesión.');
