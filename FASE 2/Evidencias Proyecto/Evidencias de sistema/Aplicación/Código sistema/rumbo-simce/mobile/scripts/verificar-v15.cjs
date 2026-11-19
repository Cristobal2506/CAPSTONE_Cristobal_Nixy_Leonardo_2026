// Verificador offline v15 de la app (no necesita teléfono).
const fs=require('fs'),path=require('path');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const errores=[];const ok=(c,m)=>{if(!c)errores.push(m);};
const camino=leer('src/screens/MiCamino.tsx'),app=leer('App.tsx'),rev=leer('src/screens/RevisionesUnidad.tsx');
ok(/onCerrarSesion/.test(camino)&&/accessibilityLabel="Cerrar sesión"/.test(camino),'MiCamino debe tener botón visible de cerrar sesión');
ok(/onCerrarSesion=\{\(\) => void salir\(\)\}/.test(app),'App debe pasar salir() a MiCamino');
ok(/n\.estado === 'omitido'/.test(camino),'las unidades omitidas deben resumirse en una línea');
ok(/<DetalleEvaluacion/.test(rev),'Pruebas a revisar debe mostrar el detalle de respuestas');
ok(/detalleEvaluacion/.test(leer('src/api.ts')),'api.ts debe exponer detalleEvaluacion');
ok(/confirmar\(/.test(leer('src/components/CabeceraSesion.tsx')),'la X de la cabecera debe usar la confirmación común');
ok(/registerGlobals\(\)/.test(leer('index.ts')),'no quitar registerGlobals() de LiveKit');
if(errores.length){console.error('FALLA v15:\n- '+errores.join('\n- '));process.exit(1);}
console.log('OK v15: cerrar sesión visible para el alumno, unidades omitidas resumidas, detalle de respuestas para el docente y LiveKit intacto.');
