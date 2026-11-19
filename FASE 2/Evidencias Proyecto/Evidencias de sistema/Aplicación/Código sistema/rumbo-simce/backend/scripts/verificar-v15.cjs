// Verificador offline v15 (no necesita base de datos).
const fs=require('fs'),path=require('path');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const errores=[];
const ok=(c,m)=>{if(!c)errores.push(m);};
const lib=leer('src/lib/evaluaciones.js'),ruta=leer('src/routes/docente.js');
ok(/async function detalleDocente/.test(lib),'falta detalleDocente en lib/evaluaciones.js');
ok(/Number\(i\.docente_id\)!==docenteId/.test(lib.slice(lib.indexOf('async function detalleDocente'))),'detalleDocente debe verificar que el docente sea el del curso');
ok(/evaluaciones\/:id\/detalle/.test(ruta),'falta la ruta GET /docente/evaluaciones/:id/detalle');
ok(/requireRole\('docente'\)/.test(ruta),'las rutas docente deben exigir rol docente');
const seed=leer('seeds/009_correcciones_v15.sql');
const updates=seed.split('\n').filter(l=>l.startsWith('UPDATE pregunta'));
ok(updates.length===10,'la semilla 009 debe corregir 10 comparaciones de fracciones');
for(const l of updates){const ops=JSON.parse(l.match(/opciones='(.*?)'::jsonb/)[1]);ok(ops.length===2,'cada comparación debe tener 2 opciones: '+l.slice(0,80));}
if(errores.length){console.error('FALLA v15:\n- '+errores.join('\n- '));process.exit(1);}
console.log('OK v15: detalle docente protegido por curso, ruta publicada y 10 comparaciones de fracciones con 2 alternativas.');
