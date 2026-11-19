const { api, crearAdulto, crearEstudianteConSesion, auth,cuerpoRespuesta} = require('./helpers');
const { pool } = require('../src/db');

afterAll(() => pool.end());

test('v12: cinco unidades, 17 tandas, banco original y cinco pruebas + ensayo', async () => {
  const { rows: unidades } = await pool.query("SELECT codigo,orden FROM nivel WHERE codigo LIKE 'SIMCE-U%' ORDER BY orden");
  expect(unidades.map(u => u.codigo)).toEqual(['SIMCE-U1','SIMCE-U2','SIMCE-U3','SIMCE-U4','SIMCE-U5']);
  const { rows: conjuntos } = await pool.query("SELECT COUNT(*)::int AS n FROM conjunto WHERE activo AND codigo LIKE 'U%-C%'");
  expect(conjuntos[0].n).toBe(17);
  const { rows: preguntas } = await pool.query("SELECT COUNT(*)::int AS n FROM pregunta WHERE activa AND codigo LIKE 'V12-%'");
  expect(preguntas[0].n).toBe(270);
  const { rows: examenes } = await pool.query('SELECT tipo,COUNT(*)::int AS n FROM evaluacion GROUP BY tipo');
  expect(Object.fromEntries(examenes.map(e=>[e.tipo,e.n]))).toEqual({unidad:5,final:1});
  const {rows: finales}=await pool.query("SELECT COUNT(*)::int AS n FROM evaluacion_pregunta WHERE evaluacion_id=(SELECT id FROM evaluacion WHERE codigo='ENSAYO-FINAL')");
  expect(finales[0].n).toBe(40);
});

test('v12: solo se abre examen tras dominar las hojas; se corrige y el profesor autoriza', async () => {
  const doc = await crearAdulto('docente');
  const est = await crearEstudianteConSesion();
  const curso = await api().post('/api/docente/cursos').set(auth(doc.token))
    .send({ nombre:'Curso v12 de pruebas', anio:2026 });
  expect(curso.status).toBe(201);
  expect((await api().post(`/api/apoderado/estudiantes/${est.id}/curso`).set(auth(est.apo.token))
    .send({ codigoCurso:curso.body.curso.codigo_union })).status).toBe(200);
  const catalogo = await api().get('/api/evaluaciones').set(auth(est.token));
  expect(catalogo.status).toBe(200);
  expect(catalogo.body.evaluaciones).toHaveLength(6);
  const examen=catalogo.body.evaluaciones[0];
  expect(examen.habilitada).toBe(false);
  expect((await api().post(`/api/evaluaciones/${examen.id}/iniciar`).set(auth(est.token))).status).toBe(403);
  // Precondición artificial: la tanda final de unidad 1 ya fue completada.
  const {rows:last}=await pool.query("SELECT id FROM conjunto WHERE codigo='U1-C03'");
  await pool.query(`INSERT INTO estudiante_posicion(estudiante_id,conjunto_id,punto_partida_id,cierre_nivel_pendiente)
    VALUES($1,$2,$2,TRUE) ON CONFLICT(estudiante_id) DO UPDATE SET conjunto_id=EXCLUDED.conjunto_id,cierre_nivel_pendiente=TRUE`,[est.id,last[0].id]);
  const start = await api().post(`/api/evaluaciones/${examen.id}/iniciar`).set(auth(est.token));
  expect(start.status).toBe(201);
  expect(start.body.preguntas).toHaveLength(12);
  expect(JSON.stringify(start.body)).not.toMatch(/respuestaCorrecta|respuesta_correcta|explicacion/);
  const intento=start.body.intento.id;
  expect((await api().post(`/api/evaluaciones/intentos/${intento}/entregar`).set(auth(est.token))).status).toBe(400);
  for(const p of start.body.preguntas){
    const {rows}=await pool.query('SELECT respuesta_correcta FROM pregunta WHERE id=$1',[p.id]);
    const r=await api().put(`/api/evaluaciones/intentos/${intento}/respuesta`).set(auth(est.token))
      .send(await cuerpoRespuesta(p.id,'correcta')); // v16
    expect(rows).toHaveLength(1);
    expect(r.status).toBe(200);
  }
  const submit=await api().post(`/api/evaluaciones/intentos/${intento}/entregar`).set(auth(est.token));
  expect(submit.status).toBe(200);
  expect(submit.body.resultado).toMatchObject({aprobado:true,porcentaje:100,correctas:12,total:12});
  expect((await api().post(`/api/evaluaciones/${examen.id}/iniciar`).set(auth(est.token))).status).toBe(409);
  const pendientes=await api().get('/api/docente/evaluaciones/pendientes').set(auth(doc.token));
  expect(pendientes.body.pendientes.some(p=>p.id===intento)).toBe(true);
  const review=await api().post(`/api/docente/evaluaciones/${intento}/revisar`).set(auth(doc.token))
    .send({autorizar:true,observacion:'Excelente progreso'});
  expect(review.status).toBe(200);
  const {rows:pos}=await pool.query('SELECT c.codigo,ep.cierre_nivel_pendiente FROM estudiante_posicion ep JOIN conjunto c ON c.id=ep.conjunto_id WHERE ep.estudiante_id=$1',[est.id]);
  expect(pos[0]).toMatchObject({codigo:'U2-C01',cierre_nivel_pendiente:false});
  const nuevo=await api().get('/api/evaluaciones').set(auth(est.token));
  expect(nuevo.body.evaluaciones[0].ultimo.autorizado).toBe(true);
  expect(nuevo.body.evaluaciones.find(e=>e.tipo==='final').habilitada).toBe(false);
});
