// Ejecución integrada en una BD EXCLUSIVA de pruebas: npm run test:v15
require('./v14.test.js');
const {api,crearAdulto,crearEstudianteConSesion,auth,cuerpoRespuesta}=require('./helpers');
const {pool}=require('../src/db');

async function diagnosticoEntregado(){
 const docente=await crearAdulto('docente');const est=await crearEstudianteConSesion();
 const curso=await api().post('/api/docente/cursos').set(auth(docente.token)).send({nombre:'Curso v15',anio:2026});
 await api().post(`/api/apoderado/estudiantes/${est.id}/curso`).set(auth(est.apo.token)).send({codigoCurso:curso.body.curso.codigo_union});
 const ex=await api().get('/api/evaluaciones/diagnostico').set(auth(est.token));
 const inicio=await api().post(`/api/evaluaciones/${ex.body.id}/iniciar`).set(auth(est.token));
 const intento=inicio.body.intento.id;
 const ids=inicio.body.preguntas.map(q=>q.id);
 const {rows}=await pool.query(`SELECT p.id,p.respuesta_correcta,p.opciones,n.orden AS unidad FROM pregunta p
   JOIN unidad_oa uo ON uo.oa_codigo=p.oa_codigo JOIN nivel n ON n.id=uo.nivel_id AND n.codigo LIKE 'SIMCE-U%'
   WHERE p.id=ANY($1::bigint[])`,[ids]);
 // Domina U1 y U2; falla todo desde U3.
 for(const q of rows){
  // v16: según la pregunta, alternativa o número escrito
  const body=await cuerpoRespuesta(q.id,q.unidad<=2?'correcta':'incorrecta');
  expect((await api().put(`/api/evaluaciones/intentos/${intento}/respuesta`).set(auth(est.token)).send(body)).status).toBe(200);
 }
 expect((await api().post(`/api/evaluaciones/intentos/${intento}/entregar`).set(auth(est.token))).status).toBe(200);
 return {docente,est,intento};
}

test('v15: el docente del curso ve el detalle del diagnóstico por unidad y una unidad sugerida',async()=>{
 const {docente,intento}=await diagnosticoEntregado();
 const r=await api().get(`/api/docente/evaluaciones/${intento}/detalle`).set(auth(docente.token));
 expect(r.status).toBe(200);
 expect(r.body.preguntas).toHaveLength(40);
 expect(r.body.porUnidad.map(u=>[u.unidad,u.total])).toEqual([[1,8],[2,8],[3,8],[4,8],[5,8]]);
 expect(r.body.porUnidad[0].correctas).toBe(8);expect(r.body.porUnidad[2].correctas).toBe(0);
 expect(r.body.unidadSugerida).toBe(3);
 const mala=r.body.preguntas.find(q=>!q.esCorrecta);
 expect(mala.elegida).not.toBeNull();expect(mala.correcta.texto).not.toBe(mala.elegida.texto);
});

test('v15: nadie más que el docente del curso ve el detalle',async()=>{
 const {est,intento}=await diagnosticoEntregado();
 const otroDocente=await crearAdulto('docente');
 expect((await api().get(`/api/docente/evaluaciones/${intento}/detalle`).set(auth(otroDocente.token))).status).toBe(404);
 expect((await api().get(`/api/docente/evaluaciones/${intento}/detalle`).set(auth(est.apo.token))).status).toBe(403);
 expect((await api().get(`/api/docente/evaluaciones/${intento}/detalle`).set(auth(est.token))).status).toBe(403);
});

test('v15: comparar fracciones ofrece solo las dos fracciones del enunciado',async()=>{
 const {rows}=await pool.query(`SELECT codigo,enunciado,opciones,respuesta_correcta FROM pregunta
   WHERE enunciado ~* '^Compara \\S+ y \\S+\\. ¿Cuál es (mayor|menor)\\?$'`);
 expect(rows.length).toBeGreaterThanOrEqual(10);
 for(const q of rows){
  expect(q.opciones).toHaveLength(2);
  for(const o of q.opciones) expect(q.enunciado).toContain(o.texto);
 }
 expect(rows.find(q=>q.codigo==='V12-U3C1H1Q2').respuesta_correcta).toBe('B');
});
