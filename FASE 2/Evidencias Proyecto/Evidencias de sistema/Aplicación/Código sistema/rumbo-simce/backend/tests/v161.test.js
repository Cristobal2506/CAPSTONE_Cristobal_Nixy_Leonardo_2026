// Ejecución integrada en una BD EXCLUSIVA de pruebas: npm run test:v16  (v16.1 encadena v16 → v15 → …)
// v16.1: un alumno nunca queda sin lección para jugar (caso «Iris»).
require('./v16.test.js');
const {api,crearEstudianteConSesion,auth,cuerpoTanda}=require('./helpers'); // v16.3: alternativa o número escrito
const {pool}=require('../src/db');

const camino=(t)=>api().get('/api/estudiante/camino').set(auth(t)).then(r=>r.body);
async function opcionDe(preguntaId,bien){
 const {rows}=await pool.query('SELECT respuesta_correcta,opciones FROM pregunta WHERE id=$1',[preguntaId]);
 return bien?rows[0].respuesta_correcta:rows[0].opciones.find(o=>o.clave!==rows[0].respuesta_correcta).clave;
}
/** Juega una tanda completa. malas = cuántos ejercicios responde mal en la primera vuelta (después los corrige). */
async function hacerTanda(token,{malas=0,conjuntoId}={}){
 const r0=await api().post('/api/estudiante/tandas').set(auth(token)).send(conjuntoId?{conjuntoId}:{});
 expect([200,201]).toContain(r0.status);
 const t=r0.body.tanda;const ej=t.hojas.flatMap(h=>h.ejercicios);
 for(const [i,e] of ej.entries())await api().post(`/api/estudiante/tandas/${t.id}/respuestas`).set(auth(token)).send(await cuerpoTanda(e.id,i>=malas));
 let r=await api().post(`/api/estudiante/tandas/${t.id}/revisar`).set(auth(token));
 while(!r.body.terminado){
  for(const id of r.body.aCorregir)await api().post(`/api/estudiante/tandas/${t.id}/respuestas`).set(auth(token)).send(await cuerpoTanda(id,true));
  r=await api().post(`/api/estudiante/tandas/${t.id}/revisar`).set(auth(token));
 }
 return {tanda:t,resultado:r.body.resultado,total:ej.length};
}
async function alumnoEnUnidad2(){
 const est=await crearEstudianteConSesion();
 await pool.query("INSERT INTO diagnostico_estado(estudiante_id,estado) VALUES($1,'exento')",[est.id]);
 const {rows:c}=await pool.query(`SELECT c.id,c.codigo FROM conjunto c JOIN nivel n ON n.id=c.nivel_id
   WHERE c.activo AND n.codigo='SIMCE-U2' ORDER BY c.orden`);
 await pool.query(`INSERT INTO estudiante_posicion(estudiante_id,conjunto_id,punto_partida_id) VALUES($1,$2,$2)
   ON CONFLICT(estudiante_id) DO UPDATE SET conjunto_id=EXCLUDED.conjunto_id`,[est.id,c[0].id]);
 await pool.query(`INSERT INTO unidad_omitida_diagnostico(estudiante_id,nivel_id) SELECT $1,id FROM nivel WHERE codigo='SIMCE-U1'`,[est.id]);
 return {est,lecciones:c.map(x=>({id:Number(x.id),codigo:x.codigo}))};
}
const estados=(cam,ids)=>ids.map(id=>cam.niveles.flatMap(n=>n.conjuntos).find(c=>c.id===id).estado);

test('v16.1: si retrocede a una lección ya dominada, esa lección queda como «actual» y puede seguir avanzando',async()=>{
 const {est,lecciones:[l1,l2]}=await alumnoEnUnidad2();
 expect((await hacerTanda(est.token)).resultado.decision).toBe('avanzar');           // domina la lección 1
 const fallo=await hacerTanda(est.token,{malas:999});                                 // falla casi todo la lección 2
 expect(fallo.resultado.decision).toBe('retroceder');
 // Antes: la lección 1 salía «dominado», ninguna «actual» y el botón «Hacer la tanda de hoy» quedaba apagado.
 let cam=await camino(est.token);
 expect(estados(cam,[l1.id,l2.id])).toEqual(['actual','bloqueado']);
 expect(cam.niveles.flatMap(n=>n.conjuntos).find(c=>c.id===l1.id).yaDominado).toBe(true);
 // «Hacer la tanda de hoy» juega la lección 1 y, al cumplir, vuelve a abrir la 2.
 const otra=await hacerTanda(est.token);
 expect(otra.resultado.decision).toBe('avanzar');
 cam=await camino(est.token);
 expect(estados(cam,[l1.id,l2.id])).toEqual(['dominado','actual']);
});

test('v16.1: «Volver a practicar» sobre la lección actual cuenta como lección normal (no como repaso que no avanza)',async()=>{
 const {est,lecciones:[l1,l2]}=await alumnoEnUnidad2();
 await hacerTanda(est.token);
 await hacerTanda(est.token,{malas:999}); // vuelve a la lección 1
 const r=await hacerTanda(est.token,{conjuntoId:l1.id});
 expect(r.resultado.decision).toBe('avanzar');
 expect(estados(await camino(est.token),[l2.id])).toEqual(['actual']);
});

test('v16.1: no hay límite diario: puede encadenar varias lecciones el mismo día',async()=>{
 const {est,lecciones}=await alumnoEnUnidad2();
 for(let i=0;i<3;i++)expect((await hacerTanda(est.token)).resultado.decision).toBe('avanzar');
 expect(estados(await camino(est.token),[lecciones[3].id])).toEqual(['actual']);
});

test('v16.1: un alumno que ya quedó atascado (posición en una lección dominada) se destraba solo',async()=>{
 const {est,lecciones:[l1,l2]}=await alumnoEnUnidad2();
 await hacerTanda(est.token);
 // Se simula el estado guardado de Iris: posición en la lección 1, ya dominada.
 await pool.query('UPDATE estudiante_posicion SET conjunto_id=$2 WHERE estudiante_id=$1',[est.id,l1.id]);
 expect(estados(await camino(est.token),[l1.id])).toEqual(['actual']);
 expect((await hacerTanda(est.token)).resultado.decision).toBe('avanzar');
 expect(estados(await camino(est.token),[l2.id])).toEqual(['actual']);
});
