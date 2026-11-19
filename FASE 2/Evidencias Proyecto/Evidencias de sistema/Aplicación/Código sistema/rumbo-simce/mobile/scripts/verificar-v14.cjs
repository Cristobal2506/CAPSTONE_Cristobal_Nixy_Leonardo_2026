// Verificación ligera de pantallas sin instalar dependencias.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const cab=read('src/components/CabeceraSesion.tsx');
assert(cab.includes('api.leerTodasNotificaciones()')&&cab.includes('setSinLeer(0)'));
assert(cab.includes('onAbrirProgreso')&&cab.includes('onCerrarSesion')&&cab.includes('confirmarSalir'));
const camino=read('src/screens/MiCamino.tsx');
assert(camino.includes('accionesFila')&&camino.includes('Hacer la tanda de hoy'));
assert(!camino.includes('<BotonGrande titulo="Salir"'));
const app=read('App.tsx');
assert(app.includes('ProgresoV14')&&app.includes('progresoAbierto')&&app.includes('onAbrirProgreso'));
assert(read('src/screens/PanelAdulto.tsx').includes('Ver progreso de mis estudiantes'));
assert(read('src/screens/ProgresoV14.tsx').includes('Pruebas realizadas'));
assert(read('src/screens/SalaLiveKit.tsx').includes('LiveKitRoom'));
assert(JSON.parse(read('package.json')).dependencies['react-native-safe-area-context']==='~5.7.0');
console.log('OK v14: cabecera progreso/notificaciones/salir, camino compacto, reportes por rol, LiveKit y safe areas.');
