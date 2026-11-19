// Ejecución integrada en una BD EXCLUSIVA de pruebas: npm test  (v16.3 encadena v16.1 → v16 → v15 → …)
// v16.3: las lecciones del camino también se responden escribiendo el número con el dedo o el lápiz.
require('./v161.test.js');
const {api,crearEstudianteConSesion,auth,cuerpoTanda}=require('./helpers');
const {pool}=require('../src/db');
const config=require('../src/config');

async function alumnoEn(codigoNivel){
 const est=await crearEstudianteConSesion();
 await pool.query("INSERT INTO diagnostico_estado(estudiante_id,estado) VALUES($1,'exento')",[est.id]);
 const {rows:c}=await pool.query(`SELECT c.id FROM conjunto c JOIN nivel n ON n.id=c.nivel_id
   WHERE c.activo AND n.codigo=$1 ORDER BY c.orden LIMIT 1`,[codigoNivel]);
 await pool.query(`INSERT INTO estudiante_posicion(estudiante_id,conjunto_id,punto_partida_id) VALUES($1,$2,$2)
   ON CONFLICT(estudiante_id) DO UPDATE SET conjunto_id=EXCLUDED.conjunto_id`,[est.id,c[0].id]);
 return est;
}
const empezar=(t)=>api().post('/api/estudiante/tandas').set(auth(t)).send({});
const responder=(t,tandaId,body)=>api().post(`/api/estudiante/tandas/${tandaId}/respuestas`).set(auth(t)).send(body);
const ejerciciosDe=(tanda)=>tanda.hojas.flatMap(h=>h.ejercicios);

test('v16.3: casi todas las lecciones se escriben y la tanda nunca envía la respuesta correcta',async()=>{
 const {rows}=await pool.query(`SELECT count(DISTINCT p.id) FILTER (WHERE p.formato_respuesta<>'alternativas')::int AS escritas,
   count(DISTINCT p.id)::int AS total FROM conjunto c JOIN hoja h ON h.conjunto_id=c.id
   JOIN hoja_ejercicio he ON he.hoja_id=h.id JOIN pregunta p ON p.id=he.pregunta_id WHERE c.activo`);
 expect(rows[0].escritas/rows[0].total).toBeGreaterThan(0.75);
 const est=await alumnoEn('SIMCE-U1');
 const r=await empezar(est.token);
 expect(r.status).toBe(201);
 const ej=ejerciciosDe(r.body.tanda);
 const escritos=ej.filter(e=>e.formatoRespuesta!=='alternativas');
 expect(escritos.length).toBeGreaterThan(0);
 for(const e of escritos)expect(e.opciones).toEqual([]);
 for(const e of ej.filter(x=>x.formatoRespuesta==='alternativas'))expect(e.opciones.length).toBeGreaterThan(1);
 expect(JSON.stringify(r.body)).not.toMatch(/respuesta_numerica|respuestaNumerica|respuesta_correcta/);
 // La meta de tiempo suma segundos por cada ejercicio escrito.
 const {rows:c}=await pool.query("SELECT tiempo_estandar_seg FROM conjunto WHERE id=$1",[r.body.tanda.conjuntoId]);
 expect(r.body.tanda.tiempoEstandarSeg).toBe(c[0].tiempo_estandar_seg+escritos.length*config.kumon.segundosExtraEscritura);
});

test('v16.3: los números escritos se corrigen por su valor, se marcan los incorrectos y se corrigen hasta terminar',async()=>{
 const est=await alumnoEn('SIMCE-U1');
 const t=(await empezar(est.token)).body.tanda;
 const ej=ejerciciosDe(t);
 const escrito=ej.find(e=>e.formatoRespuesta==='entero');
 expect(escrito).toBeTruthy();
 for(const e of ej){
  let body=await cuerpoTanda(e.id,e.id!==escrito.id);
  if(e.formatoRespuesta==='entero'&&e.id!==escrito.id)body={...body,respuesta:'0'+body.respuesta,trazos:[[[[0,0],[0,40]]]],reconocido:body.respuesta,confianza:0.9};
  const r=await responder(est.token,t.id,body);
  expect(r.status).toBe(200);
 }
 const rev=await api().post(`/api/estudiante/tandas/${t.id}/revisar`).set(auth(est.token));
 expect(rev.body.terminado).toBe(false);
 expect(rev.body.aCorregir).toEqual([escrito.id]);
 expect((await responder(est.token,t.id,await cuerpoTanda(escrito.id,true))).status).toBe(200);
 const fin=await api().post(`/api/estudiante/tandas/${t.id}/revisar`).set(auth(est.token));
 expect(fin.body.terminado).toBe(true);
 expect(fin.body.resultado.correctasPrimeraVuelta).toBe(ej.length-1);
 // Se guardan los trazos y lo que leyó el sistema.
 const {rows}=await pool.query("SELECT count(*)::int AS n FROM intento_respuesta WHERE intento_id=$1 AND trazos IS NOT NULL AND reconocido IS NOT NULL",[t.id]);
 expect(rows[0].n).toBeGreaterThan(0);
});

test('v16.3: valida el formato de la respuesta según el ejercicio',async()=>{
 const est=await alumnoEn('SIMCE-U1');
 const t=(await empezar(est.token)).body.tanda;
 const ej=ejerciciosDe(t);
 const escrito=ej.find(e=>e.formatoRespuesta!=='alternativas');
 expect((await responder(est.token,t.id,{preguntaId:escrito.id,opcion:'A'})).body.error.code).toBe('RESPUESTA_INVALIDA');
 expect((await responder(est.token,t.id,{preguntaId:escrito.id,respuesta:'doce'})).body.error.code).toBe('RESPUESTA_INVALIDA');
 expect((await responder(est.token,t.id,{preguntaId:escrito.id,respuesta:'1',opcion:'A'})).status).toBe(400);
 const alt=ej.find(e=>e.formatoRespuesta==='alternativas');
 if(alt)expect((await responder(est.token,t.id,{preguntaId:alt.id,respuesta:'12'})).body.error.code).toBe('OPCION_INVALIDA');
 // Retomar la tanda devuelve el número ya escrito.
 await responder(est.token,t.id,await cuerpoTanda(escrito.id,true));
 const otra=(await empezar(est.token)).body;
 expect(otra.retomada).toBe(true);
 expect(otra.tanda.respuestas.find(r=>r.preguntaId===escrito.id).respuesta).toBeTruthy();
});

test('v16.3: escribir un distractor registra el mismo tipo de error que elegir esa alternativa',async()=>{
 const est=await alumnoEn('SIMCE-U1');
 const t=(await empezar(est.token)).body.tanda;
 const e=ejerciciosDe(t).find(x=>x.formatoRespuesta==='entero');
 // Se etiqueta en la BD de pruebas un distractor numérico de ese ejercicio con un tipo de error.
 const {rows}=await pool.query('SELECT opciones,respuesta_correcta FROM pregunta WHERE id=$1',[e.id]);
 const idx=rows[0].opciones.findIndex(o=>o.clave!==rows[0].respuesta_correcta&&/^[0-9.]+$/.test(o.texto));
 expect(idx).toBeGreaterThanOrEqual(0);
 await pool.query(`UPDATE pregunta SET opciones=jsonb_set(opciones,$2,'"valor_posicional"') WHERE id=$1`,[e.id,`{${idx},tipo_error}`]);
 const distractor=rows[0].opciones[idx].texto.replace(/\./g,'');
 expect((await responder(est.token,t.id,{preguntaId:e.id,respuesta:distractor})).status).toBe(200);
 const {rows:r}=await pool.query('SELECT tipo_error,es_correcta FROM intento_respuesta WHERE intento_id=$1 AND pregunta_id=$2',[t.id,e.id]);
 expect(r[0]).toEqual({tipo_error:'valor_posicional',es_correcta:false});
 // Un número que no es ninguna alternativa queda incorrecto, sin tipo de error.
 expect((await responder(est.token,t.id,{preguntaId:e.id,respuesta:'98765'})).status).toBe(200);
 const {rows:r2}=await pool.query('SELECT tipo_error,es_correcta FROM intento_respuesta WHERE intento_id=$1 AND pregunta_id=$2',[t.id,e.id]);
 expect(r2[0]).toEqual({tipo_error:null,es_correcta:false});
});
