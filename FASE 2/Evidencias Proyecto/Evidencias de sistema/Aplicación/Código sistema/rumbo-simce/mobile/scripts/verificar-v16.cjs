// Verificador offline v16 de la app (no necesita Metro): node scripts/verificar-v16.cjs
const fs=require('fs'),path=require('path');
const src=path.join(__dirname,'../src');const leer=f=>fs.readFileSync(path.join(src,f),'utf8');
const errores=[];const ok=(c,m)=>{if(!c)errores.push(m);};
for(const f of ['components/PizarraNumero.tsx','components/RespuestaEscrita.tsx','components/PreguntaRespuesta.tsx','components/Trazos.tsx'])ok(fs.existsSync(path.join(src,f)),'falta '+f);
const pizarra=leer('components/PizarraNumero.tsx');
ok(!/from ['"](react-native-svg|expo-gl|@shopify\/react-native-skia)/.test(pizarra+leer('components/Trazos.tsx')),'el lienzo no debe usar módulos nativos (obligaría a recompilar la APK)');
ok(/onResponderTerminationRequest=\{\(\) => false\}/.test(pizarra),'el lienzo debe impedir que el ScrollView robe el trazo');
ok(/reconocerNumero/.test(leer('api.ts'))&&/responderEvaluacionEscrita/.test(leer('api.ts')),'faltan métodos v16 en api.ts');
ok(/Sí, esa es mi respuesta/.test(leer('components/RespuestaEscrita.tsx')),'el alumno debe confirmar la lectura antes de guardar');
// v16.3: las lecciones del camino también se responden escribiendo.
const tanda=leer('screens/Tanda.tsx');
ok(/RespuestaEscrita/.test(tanda)&&/responderTandaEscrita/.test(tanda),'Tanda.tsx debe usar la respuesta escrita en los ejercicios numéricos');
ok(/scrollEnabled=\{!dibujando\}/.test(tanda),'Tanda.tsx debe bloquear el scroll mientras el alumno escribe');
let rendir='';try{rendir=leer('screens/RendirEvaluacion.tsx');}catch{}
ok(/PreguntaRespuesta/.test(rendir),'RendirEvaluacion.tsx debe usar <PreguntaRespuesta> (ver docs/cambios-v16.md)');
if(errores.length){console.error('FALLA v16 (mobile):\n- '+errores.join('\n- '));process.exit(1);}
console.log('OK v16 mobile: lienzo sin módulos nativos, confirmación de lectura, evaluaciones y lecciones con respuesta escrita.');
