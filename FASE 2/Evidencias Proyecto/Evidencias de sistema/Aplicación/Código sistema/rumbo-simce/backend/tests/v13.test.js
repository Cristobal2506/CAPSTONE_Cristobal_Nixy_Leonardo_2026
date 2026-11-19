const {api,crearAdulto,crearEstudianteConSesion,auth,cuerpoRespuesta}=require('./helpers');
const {pool}=require('../src/db');
afterAll(()=>pool.end());
async function preparar(){
 const docente=await crearAdulto('docente');const est=await crearEstudianteConSesion();
 const curso=await api().post('/api/docente/cursos').set(auth(docente.token)).send({nombre:'Curso pruebas v13',anio:2026});
 expect(curso.status).toBe(201);
 const union=await api().post(`/api/apoderado/estudiantes/${est.id}/curso`).set(auth(est.apo.token))
  .send({codigoCurso:curso.body.curso.codigo_union});expect(union.status).toBe(200);
 return {docente,est};
}
test('v13: catalogo: cinco pruebas de 25/50, diagnostico de 40/60 y ensayo de 40',async()=>{
 const {rows}=await pool.query(`SELECT codigo,tipo,tiempo_limite_seg,COUNT(ep.pregunta_id)::int n
 FROM evaluacion e JOIN evaluacion_pregunta ep ON ep.evaluacion_id=e.id GROUP BY e.id ORDER BY codigo`);
 expect(rows.filter(e=>e.tipo==='unidad')).toHaveLength(5);
 expect(rows.filter(e=>e.tipo==='unidad').every(e=>e.n===25&&e.tiempo_limite_seg===3000)).toBe(true);
 expect(rows.find(e=>e.tipo==='diagnostico')).toMatchObject({n:40,tiempo_limite_seg:3600});
 expect(rows.find(e=>e.tipo==='final').n).toBe(40);
 const {rows:pos}=await pool.query("SELECT enunciado,opciones,respuesta_correcta FROM pregunta WHERE codigo IN ('V12-E1-Q03','V12-U1C2H1Q3','V12-U1C2H1Q1') ORDER BY codigo");
 expect(pos.find(x=>x.enunciado.includes('[[7]]'))?.enunciado).toContain('[[7]]');
 expect(pos.some(x=>x.enunciado.includes('dígito 0'))).toBe(false);
 expect(pos.find(x=>x.enunciado.includes('mayor número'))?.opciones).toHaveLength(2);
});
test('v13: alumno nuevo solo puede hacer diagnostico; sin nota antes de revisar; profesor asigna unidad',async()=>{
 const {docente,est}=await preparar();
 expect((await api().get('/api/estudiante/camino').set(auth(est.token))).status).toBe(403);
 expect((await api().post('/api/estudiante/tandas').set(auth(est.token)).send({})).status).toBe(403);
 const estado=await api().get('/api/evaluaciones/diagnostico/estado').set(auth(est.token));
 expect(estado.body.estado).toBe('pendiente');
 const ex=await api().get('/api/evaluaciones/diagnostico').set(auth(est.token));
 const inicio=await api().post(`/api/evaluaciones/${ex.body.id}/iniciar`).set(auth(est.token));
 expect(inicio.status).toBe(201);expect(inicio.body.preguntas).toHaveLength(40);
 const attempt=inicio.body.intento.id;
 // El intento abierto se retoma, nunca permite un segundo diagnostico.
 expect((await api().post(`/api/evaluaciones/${ex.body.id}/iniciar`).set(auth(est.token))).body.intento.id).toBe(attempt);
 for(const q of inicio.body.preguntas){
  const r=await api().put(`/api/evaluaciones/intentos/${attempt}/respuesta`).set(auth(est.token)).send(await cuerpoRespuesta(q.id,'incorrecta')); // v16: escrita o alternativa
  expect(r.status).toBe(200);
 }
 const entrega=await api().post(`/api/evaluaciones/intentos/${attempt}/entregar`).set(auth(est.token));
 expect(entrega.status).toBe(200);
 expect(entrega.body.resultado).toMatchObject({correctas:null,porcentaje:null,aprobado:null});
 expect((await api().get('/api/evaluaciones/diagnostico/estado').set(auth(est.token))).body.estado).toBe('en_revision');
 expect((await api().post(`/api/evaluaciones/${ex.body.id}/iniciar`).set(auth(est.token))).status).toBe(409);
 const rev=await api().get('/api/docente/evaluaciones/pendientes').set(auth(docente.token));
 expect(rev.body.pendientes.find(x=>x.id===attempt).tipo).toBe('diagnostico');
 expect((await api().post(`/api/docente/evaluaciones/${attempt}/revisar`).set(auth(docente.token)).send({autorizar:true,unidadInicial:3})).status).toBe(400);
 const ok=await api().post(`/api/docente/evaluaciones/${attempt}/revisar`).set(auth(docente.token)).send({autorizar:true,unidadInicial:3,observacion:'Puedes comenzar en fracciones'});
 expect(ok.status).toBe(200);
 const st=await api().get('/api/evaluaciones/diagnostico/estado').set(auth(est.token));
 expect(st.body.estado).toBe('asignado');
 const camino=await api().get('/api/estudiante/camino').set(auth(est.token));
 expect(camino.status).toBe(200);
 expect(camino.body.niveles.find(x=>x.codigo==='SIMCE-U1').estado).toBe('omitido');
 expect(camino.body.niveles.find(x=>x.codigo==='SIMCE-U3').estado).toBe('actual');
 const avisos=await api().get('/api/notificaciones').set(auth(est.token));
 expect(avisos.body.noLeidas).toBeGreaterThanOrEqual(1);
});
test('v13: se revisan notas bajas, obligando feedback, sin filtrar puntaje y con reintento',async()=>{
 const {docente,est}=await preparar();
 // Exencion pedagogica artificial para aislar prueba de unidad (documenta el caso de prueba).
 await pool.query("INSERT INTO diagnostico_estado(estudiante_id,estado) VALUES($1,'exento')",[est.id]);
 const {rows:conj}=await pool.query("SELECT id FROM conjunto WHERE codigo='U1-C03'");
 await pool.query(`INSERT INTO estudiante_posicion(estudiante_id,conjunto_id,punto_partida_id,cierre_nivel_pendiente)
 VALUES($1,$2,$2,TRUE)`,[est.id,conj[0].id]);
 const catalogo=await api().get('/api/evaluaciones').set(auth(est.token));
 const e=catalogo.body.evaluaciones.find(x=>x.codigo==='EVAL-U1');expect(e.habilitada).toBe(true);
 const started=await api().post(`/api/evaluaciones/${e.id}/iniciar`).set(auth(est.token));
 expect(started.body.preguntas).toHaveLength(25);
 expect(JSON.stringify(started.body)).not.toMatch(/respuesta_correcta|respuestaCorrecta|explicacion/);
 for(const q of started.body.preguntas){
  const {rows}=await pool.query('SELECT respuesta_correcta FROM pregunta WHERE id=$1',[q.id]);
  expect(rows).toHaveLength(1);
  const r=await api().put(`/api/evaluaciones/intentos/${started.body.intento.id}/respuesta`).set(auth(est.token)).send(await cuerpoRespuesta(q.id,'incorrecta'));
  expect(r.status).toBe(200);
 }
 const delivered=await api().post(`/api/evaluaciones/intentos/${started.body.intento.id}/entregar`).set(auth(est.token));
 expect(delivered.body.resultado).toMatchObject({porcentaje:null,correctas:null,aprobado:null});
 const teacher=await api().get('/api/docente/evaluaciones/pendientes').set(auth(docente.token));
 const pending=teacher.body.pendientes.find(p=>p.id===started.body.intento.id);
 expect(pending.porcentaje).toBe(0);expect(pending.duracion_seg).toBeGreaterThanOrEqual(1);
 const decision=await api().post(`/api/docente/evaluaciones/${pending.id}/revisar`).set(auth(docente.token))
  .send({autorizar:false,observacion:'Repasa el valor posicional'});
 expect(decision.status).toBe(200);
 const after=await api().get('/api/evaluaciones').set(auth(est.token));
 const review=after.body.evaluaciones.find(x=>x.id===e.id);
 expect(review.ultimo).toMatchObject({porcentaje:0,autorizado:false,observacion:'Repasa el valor posicional'});
 expect(review.habilitada).toBe(true);
});
