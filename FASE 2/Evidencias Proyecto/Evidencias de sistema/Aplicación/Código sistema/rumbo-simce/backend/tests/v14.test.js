// Ejecución integrada en una BD EXCLUSIVA de pruebas: npm run test:v14
require('./v131.test.js');
const {api,crearAdulto,crearEstudianteConSesion,auth}=require('./helpers');
const {pool}=require('../src/db');

test('v14: cinco unidades con 32 lecciones, 150 ejercicios adicionales y evaluaciones intactas',async()=>{
 const {rows}=await pool.query(`SELECT n.codigo,COUNT(c.id)::int AS cantidad FROM nivel n JOIN conjunto c ON c.nivel_id=n.id
 WHERE n.codigo LIKE 'SIMCE-U%' AND c.activo GROUP BY n.codigo ORDER BY n.codigo`);
 expect(rows.map(r=>r.cantidad)).toEqual([6,6,6,6,8]);
 const {rows:qs}=await pool.query(`SELECT COUNT(*)::int AS total,COUNT(DISTINCT enunciado)::int AS distintos
 FROM pregunta WHERE codigo LIKE 'V14-%'`);
 expect(qs[0]).toEqual({total:150,distintos:150});
 const {rows:ex}=await pool.query(`SELECT e.tipo,COUNT(ep.pregunta_id)::int AS n FROM evaluacion e
 JOIN evaluacion_pregunta ep ON ep.evaluacion_id=e.id WHERE e.activa
 GROUP BY e.id`);
 expect(ex.filter(x=>x.tipo==='unidad')).toHaveLength(5);
 expect(ex.filter(x=>x.tipo==='unidad').every(x=>x.n===25)).toBe(true);
 expect(ex.find(x=>x.tipo==='final').n).toBe(40);
 expect(ex.find(x=>x.tipo==='diagnostico').n).toBe(40);
});

test('v14: abrir campanita marca solo avisos del usuario autenticado y deja historial',async()=>{
 const a=await crearEstudianteConSesion(),b=await crearEstudianteConSesion();
 const {rows:[one]}=await pool.query("INSERT INTO notificacion(estudiante_id,titulo,mensaje) VALUES($1,'Tarea','Revision') RETURNING id",[a.id]);
 const {rows:[two]}=await pool.query("INSERT INTO notificacion(estudiante_id,titulo,mensaje) VALUES($1,'Aviso ajeno','No tocar') RETURNING id",[b.id]);
 expect((await api().get('/api/notificaciones').set(auth(a.token))).body.noLeidas).toBeGreaterThan(0);
 const marked=await api().post('/api/notificaciones/leer-todas').set(auth(a.token));
 expect(marked.status).toBe(200);
 expect((await api().get('/api/notificaciones').set(auth(a.token))).body.noLeidas).toBe(0);
 expect((await api().get('/api/notificaciones').set(auth(a.token))).body.notificaciones.some(n=>n.id===Number(one.id))).toBe(true);
 const {rows:[foreign]}=await pool.query('SELECT leida FROM notificacion WHERE id=$1',[two.id]);
 expect(foreign.leida).toBe(false);
});

test('v14: docente y apoderado solo consultan estudiantes vinculados; notas pendientes ocultas',async()=>{
 const docente=await crearAdulto('docente');
 const noRelacionado=await crearAdulto('apoderado');
 const a=await crearEstudianteConSesion();
 const curso=await api().post('/api/docente/cursos').set(auth(docente.token)).send({nombre:'Matematica 4 A'});
 expect(curso.status).toBe(201);
 const inscripcion=await api().post(`/api/apoderado/estudiantes/${a.id}/curso`).set(auth(a.apo.token))
   .send({codigoCurso:curso.body.curso.codigo_union});
 expect(inscripcion.status).toBe(200);
 const listado=await api().get('/api/progreso/estudiantes').set(auth(docente.token));
 expect(listado.status).toBe(200);expect(listado.body.estudiantes.some(x=>x.id===a.id)).toBe(true);
 const visto=await api().get(`/api/progreso/estudiantes/${a.id}`).set(auth(docente.token));
 expect(visto.status).toBe(200);expect(visto.body.unidades).toHaveLength(5);
 expect(visto.body.resumen.totalLecciones).toBe(32);
 const tutor=await api().get(`/api/progreso/estudiantes/${a.id}`).set(auth(a.apo.token));
 expect(tutor.status).toBe(200);
 expect((await api().get(`/api/progreso/estudiantes/${a.id}`).set(auth(noRelacionado.token))).status).toBe(404);
 expect((await api().get('/api/progreso/mio').set(auth(docente.token))).status).toBe(403);
 expect((await api().get('/api/progreso/estudiantes').set(auth(a.token))).status).toBe(403);
 const own=await api().get('/api/progreso/mio').set(auth(a.token));
 expect(own.status).toBe(200);expect(own.body.estudiante.id).toBe(a.id);
 const {rows:[eval1]}=await pool.query("SELECT id FROM evaluacion WHERE codigo='EVAL-U1'");
 await pool.query(`INSERT INTO evaluacion_intento(evaluacion_id,estudiante_id,entregado_en,correctas,total,porcentaje,aprobado,duracion_seg)
 VALUES($1,$2,now(),19,25,76,TRUE,550)`,[eval1.id,a.id]);
 const pending=(await api().get('/api/progreso/mio').set(auth(a.token))).body.evaluaciones[0];
 expect(pending.porcentaje).toBeNull();expect(pending.correctas).toBeNull();
 await pool.query(`UPDATE evaluacion_intento SET revisado_en=now(),revisado_por=$1,autorizado=TRUE,observacion='Buen trabajo'
 WHERE estudiante_id=$2 AND evaluacion_id=$3`,[docente.usuario.id,a.id,eval1.id]);
 const reviewed=(await api().get('/api/progreso/mio').set(auth(a.token))).body.evaluaciones[0];
 expect(reviewed.porcentaje).toBe(76);expect(reviewed.observacion).toBe('Buen trabajo');
});
