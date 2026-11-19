// Ejecución integrada en una BD EXCLUSIVA de pruebas: npm run test:v16  (encadena v15 → v14 → v13)
// v16: diagnóstico y facsímiles con respuesta escrita a mano.
require('./v15.test.js');
const {api,crearAdulto,crearEstudianteConSesion,auth}=require('./helpers');
const {pool}=require('../src/db');
const {trazosDeNumero}=require('./fixtures/trazosSinteticos');
afterAll(()=>require('../src/lib/reconocimiento').cerrar());

async function diagnosticoIniciado(){
 const docente=await crearAdulto('docente');const est=await crearEstudianteConSesion();
 const curso=await api().post('/api/docente/cursos').set(auth(docente.token)).send({nombre:'Curso v16',anio:2026});
 await api().post(`/api/apoderado/estudiantes/${est.id}/curso`).set(auth(est.apo.token)).send({codigoCurso:curso.body.curso.codigo_union});
 const ex=await api().get('/api/evaluaciones/diagnostico').set(auth(est.token));
 const inicio=await api().post(`/api/evaluaciones/${ex.body.id}/iniciar`).set(auth(est.token));
 return {docente,est,inicio};
}

test('v16: el diagnóstico pide escribir el número y nunca envía la respuesta correcta al alumno',async()=>{
 const {inicio}=await diagnosticoIniciado();
 expect(inicio.status).toBe(201);
 const escritas=inicio.body.preguntas.filter(q=>q.formatoRespuesta!=='alternativas');
 expect(escritas.length).toBeGreaterThan(0);
 for(const q of escritas){expect(q.opciones).toEqual([]);expect(['entero','decimal','fraccion']).toContain(q.formatoRespuesta);}
 const {rows}=await pool.query('SELECT respuesta_numerica FROM pregunta WHERE id=ANY($1::bigint[])',[escritas.map(q=>q.id)]);
 const cuerpo=JSON.stringify(inicio.body);
 expect(cuerpo).not.toMatch(/respuesta_numerica|respuestaNumerica|respuesta_correcta/);
 expect(rows.every(r=>r.respuesta_numerica)).toBe(true);
});

test('v16: respuestas escritas se corrigen por su valor y el docente ve la escritura',async()=>{
 const {docente,est,inicio}=await diagnosticoIniciado();
 const intento=inicio.body.intento.id;
 const {rows}=await pool.query(`SELECT p.id,p.respuesta_correcta,p.opciones,p.formato_respuesta,p.respuesta_numerica,n.orden AS unidad FROM pregunta p
   JOIN unidad_oa uo ON uo.oa_codigo=p.oa_codigo JOIN nivel n ON n.id=uo.nivel_id AND n.codigo LIKE 'SIMCE-U%'
   WHERE p.id=ANY($1::bigint[])`,[inicio.body.preguntas.map(q=>q.id)]);
 const trazos=[trazosDeNumero('7',1)];
 for(const q of rows){
  const bien=q.unidad<=2;
  let body;
  if(q.formato_respuesta==='alternativas'||!q.respuesta_numerica){
   body={preguntaId:Number(q.id),opcion:bien?q.respuesta_correcta:q.opciones.find(o=>o.clave!==q.respuesta_correcta).clave};
  }else{
   // correcta escrita con otra forma equivalente (cero a la izquierda / fracción amplificada)
   const ok=q.formato_respuesta==='fraccion'?q.respuesta_numerica.split('/').map(n=>n*2).join('/'):'0'+q.respuesta_numerica;
   body={preguntaId:Number(q.id),respuesta:bien?ok:(q.formato_respuesta==='fraccion'?'1/99':'99999'),trazos,reconocido:'7',confianza:0.9};
  }
  const r=await api().put(`/api/evaluaciones/intentos/${intento}/respuesta`).set(auth(est.token)).send(body);
  expect(r.status).toBe(200);
 }
 expect((await api().post(`/api/evaluaciones/intentos/${intento}/entregar`).set(auth(est.token))).status).toBe(200);
 const d=await api().get(`/api/docente/evaluaciones/${intento}/detalle`).set(auth(docente.token));
 expect(d.status).toBe(200);
 expect(d.body.porUnidad[0].correctas).toBe(d.body.porUnidad[0].total);
 expect(d.body.porUnidad[2].correctas).toBe(0);
 expect(d.body.unidadSugerida).toBe(3);
 const escritas=d.body.preguntas.filter(q=>q.escritura);
 expect(escritas.length).toBeGreaterThan(0);
 expect(escritas[0].escritura.trazos).toHaveLength(1);
 // el sistema "leyó" 7 y el alumno guardó otro número: el docente lo ve marcado
 expect(escritas.some(q=>q.escritura.corregidaPorAlumno)).toBe(true);
});

test('v16: rechaza texto que no es un número y valida la sesión del lector',async()=>{
 const {est,inicio}=await diagnosticoIniciado();
 const q=inicio.body.preguntas.find(x=>x.formatoRespuesta==='entero');
 const mala=await api().put(`/api/evaluaciones/intentos/${inicio.body.intento.id}/respuesta`).set(auth(est.token)).send({preguntaId:q.id,respuesta:'doce'});
 expect(mala.status).toBe(400);
 expect((await api().post('/api/reconocimiento/numero').send({trazos:trazosDeNumero('42',3)})).status).toBe(401);
 const r=await api().post('/api/reconocimiento/numero').set(auth(est.token)).send({trazos:trazosDeNumero('42',3)});
 expect(r.status).toBe(200);
 expect(r.body.lectura.texto).toBe('42');
 expect(r.body.lectura.caracteres[0]).not.toHaveProperty('caja');
});
