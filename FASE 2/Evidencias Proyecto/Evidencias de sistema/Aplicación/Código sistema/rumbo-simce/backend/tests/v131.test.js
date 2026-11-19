// Pruebas acumuladas v13 + regresiones especificas de v13.1.
require('./v13.test.js');
const {api,crearEstudianteConSesion,auth}=require('./helpers');
const {pool}=require('../src/db');

test('v13.1: 40 reactivos exclusivos, nueva evaluacion activa y cinco unidades con ocho preguntas',async()=>{
 const {rows:ex}=await pool.query("SELECT id,codigo,activa FROM evaluacion WHERE tipo='diagnostico' ORDER BY id");
 expect(ex.find(e=>e.codigo==='DIAG-INICIAL')?.activa).toBe(false);
 expect(ex.find(e=>e.codigo==='DIAG-INICIAL-V131')?.activa).toBe(true);
 const {rows}=await pool.query(`SELECT ep.orden,p.codigo,p.oa_codigo,p.enunciado,p.opciones,p.respuesta_correcta
 FROM evaluacion_pregunta ep JOIN evaluacion e ON e.id=ep.evaluacion_id
 JOIN pregunta p ON p.id=ep.pregunta_id
 WHERE e.codigo='DIAG-INICIAL-V131' ORDER BY ep.orden`);
 expect(rows).toHaveLength(40);
 expect(rows.map(x=>x.codigo)).toEqual(Array.from({length:40},(_,i)=>`V131-D${String(i+1).padStart(2,'0')}`));
 for(const x of rows){
  expect(x.opciones).toHaveLength(4);
  expect(new Set(x.opciones.map(o=>o.texto)).size).toBe(4);
  expect(x.opciones.some(o=>o.clave===x.respuesta_correcta)).toBe(true);
 }
 const alumno=await crearEstudianteConSesion();
 const r=await api().get('/api/evaluaciones/diagnostico').set(auth(alumno.token));
 expect(r.status).toBe(200);
 expect(r.body.id).toBe(ex.find(e=>e.codigo==='DIAG-INICIAL-V131').id);
});

test('v13.1: diagnostico v13 iniciado antes de migrar conserva sus 40 preguntas',async()=>{
 const alumno=await crearEstudianteConSesion();
 const {rows:[old]}=await pool.query("SELECT id FROM evaluacion WHERE codigo='DIAG-INICIAL'");
 const {rows:[attempt]}=await pool.query('INSERT INTO evaluacion_intento(evaluacion_id,estudiante_id) VALUES ($1,$2) RETURNING id',[old.id,alumno.id]);
 const r=await api().get('/api/evaluaciones/diagnostico').set(auth(alumno.token));
 expect(r.status).toBe(200);expect(r.body.id).toBe(old.id);
 const again=await api().post(`/api/evaluaciones/${old.id}/iniciar`).set(auth(alumno.token));
 expect(again.status).toBe(201);
 expect(again.body.intento.id).toBe(Number(attempt.id));
 expect(again.body.preguntas).toHaveLength(40);
});

test('v13.1: apoderado solo consulta y marca sus propias notificaciones',async()=>{
 const est=await crearEstudianteConSesion();
 const {rows:[n]}=await pool.query(`INSERT INTO notificacion(apoderado_id,titulo,mensaje)
 VALUES($1,'Evaluacion revisada','La profesora reviso una prueba') RETURNING id`,[est.apo.usuario.id]);
 const r=await api().get('/api/notificaciones').set(auth(est.apo.token));
 expect(r.status).toBe(200);
 expect(r.body.noLeidas).toBeGreaterThanOrEqual(1);
 expect(r.body.notificaciones.some(x=>x.id===Number(n.id))).toBe(true);
 const read=await api().post(`/api/notificaciones/${n.id}/leer`).set(auth(est.apo.token));
 expect(read.status).toBe(200);
 const other=await crearEstudianteConSesion();
 const denied=await api().post(`/api/notificaciones/${n.id}/leer`).set(auth(other.apo.token));
 expect(denied.status).toBe(404);
});
