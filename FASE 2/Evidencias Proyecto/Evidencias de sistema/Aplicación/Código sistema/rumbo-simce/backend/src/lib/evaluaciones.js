// Rumbo SIMCE v13: diagnostico unico, evaluaciones, tiempos reales y dictamen docente.
// El resultado interno NUNCA se entrega a un estudiante antes de la revision.
const db = require('../db');
const {notFound, forbidden, conflict, badRequest} = require('./errors');
const kumon = require('./kumon');
const {exigirConsentimiento} = require('./consentimiento');
const numerica = require('./respuestaNumerica');

// v16: una pregunta se responde escribiendo el número cuando la evaluación usa respuesta escrita
// (diagnóstico, pruebas de unidad y ensayo) y la pregunta tiene una respuesta numérica configurada.
const esEscrita = (exam,q) => Boolean(exam.respuesta_escrita && q.formato_respuesta && q.formato_respuesta!=='alternativas' && q.respuesta_numerica!=null);
// Corrige una fila con respuesta (escrita o alternativa). Un intento iniciado antes de v16 conserva sus alternativas.
function corregir(q){
 if(q.respuesta_texto!=null) return {respondida:true,correcta:numerica.esCorrecta(q.respuesta_texto,q.respuesta_numerica,q.formato_respuesta,q.forma_exacta)};
 if(q.opcion_elegida!=null) return {respondida:true,correcta:q.opcion_elegida===q.respuesta_correcta};
 return {respondida:false,correcta:false};
}
// Para mostrar al docente: miles con punto (1.500) y la unidad o el signo $ configurados.
const miles=t=>String(t).replace(/^\d{4,}/,m=>m.replace(/\B(?=(\d{3})+(?!\d))/g,'.'));
const conAfijos=(q,texto)=>texto==null?null:`${q.respuesta_prefijo?q.respuesta_prefijo+' ':''}${miles(texto)}${q.respuesta_sufijo?' '+q.respuesta_sufijo:''}`;

const idn = x => x == null ? null : Number(x);
const publico = r => ({id:Number(r.id),codigo:r.codigo,titulo:r.titulo,tipo:r.tipo,
  nivelId:idn(r.nivel_id),umbral:Number(r.umbral),tiempoLimiteSeg:r.tiempo_limite_seg});
const progresoPublico = r => r ? ({
  id:Number(r.id), evaluacionId:Number(r.evaluacion_id), iniciadoEn:r.iniciado_en,
  entregadoEn:r.entregado_en, revisadoEn:r.revisado_en, autorizado:r.revisado_en ? r.autorizado : null,
  observacion:r.revisado_en ? r.observacion : null,
  // Solo despues de dictamen docente: no revelar respuestas ni puntuacion mientras espera.
  correctas:r.revisado_en ? r.correctas : null,total:r.revisado_en ? r.total : null,
  porcentaje:r.revisado_en ? Number(r.porcentaje) : null,
  aprobado:r.revisado_en ? r.autorizado : null,
  duracionSeg:r.revisado_en ? r.duracion_seg : null,
}) : null;
async function examenPorId(id,client=db,permitirInactiva=false){
 const {rows}=await client.query(permitirInactiva
  ? 'SELECT * FROM evaluacion WHERE id=$1'
  : 'SELECT * FROM evaluacion WHERE id=$1 AND activa',[id]);
 if(!rows[0])throw notFound('Evaluacion no encontrada');return rows[0];
}
async function estadoDiagnostico(estudianteId,client=db){
 const {rows:r}=await client.query('SELECT * FROM diagnostico_estado WHERE estudiante_id=$1',[estudianteId]);
 if(r[0]) return {estado:r[0].estado,unidadInicial:idn(r[0].unidad_inicial)};
 const {rows:at}=await client.query(`SELECT i.entregado_en FROM evaluacion_intento i JOIN evaluacion e ON e.id=i.evaluacion_id
 WHERE i.estudiante_id=$1 AND e.tipo='diagnostico' ORDER BY i.id DESC LIMIT 1`,[estudianteId]);
 if(!at.length) return {estado:'pendiente',unidadInicial:null};
 return {estado:at[0].entregado_en?'en_revision':'en_curso',unidadInicial:null};
}
async function exigirDiagnostico(estudianteId,client=db){
 const estado=await estadoDiagnostico(estudianteId,client);
 if(!['asignado','exento'].includes(estado.estado)) throw forbidden('Primero completa el diagnostico y espera que tu profesor asigne tu unidad.','DIAGNOSTICO_OBLIGATORIO');
}
async function aprobadas(estudianteId,client=db){
 const {rows}=await client.query(`SELECT DISTINCT e.nivel_id FROM evaluacion_intento i JOIN evaluacion e ON e.id=i.evaluacion_id
 WHERE i.estudiante_id=$1 AND i.autorizado=TRUE AND e.tipo='unidad'
 UNION SELECT nivel_id FROM unidad_omitida_diagnostico WHERE estudiante_id=$1`,[estudianteId]);
 return new Set(rows.map(r=>Number(r.nivel_id)));
}
async function habilitada(estudianteId,exam,client=db){
 if(exam.tipo==='diagnostico') return (await estadoDiagnostico(estudianteId,client)).estado==='pendiente';
 await exigirDiagnostico(estudianteId,client);
 const a=await aprobadas(estudianteId,client);
 if(exam.tipo==='final') {
  const {rows}=await client.query("SELECT id FROM nivel WHERE codigo LIKE 'SIMCE-U%' ORDER BY orden");
  return rows.length===5 && rows.every(r=>a.has(Number(r.id)));
 }
 if(a.has(Number(exam.nivel_id)))return false;
 const {rows:pos}=await client.query('SELECT conjunto_id,cierre_nivel_pendiente FROM estudiante_posicion WHERE estudiante_id=$1',[estudianteId]);
 if(!pos[0]?.cierre_nivel_pendiente)return false;
 const {rows}=await client.query('SELECT nivel_id FROM conjunto WHERE id=$1',[pos[0].conjunto_id]);
 return Number(rows[0]?.nivel_id)===Number(exam.nivel_id);
}
async function catalogo(estudianteId){
 const {rows:exams}=await db.query("SELECT * FROM evaluacion WHERE activa AND tipo <> 'diagnostico' ORDER BY CASE WHEN tipo='final' THEN 9 ELSE 0 END,nivel_id");
 const estado=await estadoDiagnostico(estudianteId);
 if(!['asignado','exento'].includes(estado.estado))return [];
 const out=[];
 for(const e of exams){
  const {rows}=await db.query('SELECT * FROM evaluacion_intento WHERE estudiante_id=$1 AND evaluacion_id=$2 ORDER BY id DESC LIMIT 1',[estudianteId,e.id]);
  const ultimo=rows[0]||null;
  let habilitar=await habilitada(estudianteId,e);
  if(ultimo && (!ultimo.entregado_en || (ultimo.entregado_en && !ultimo.revisado_en) || ultimo.autorizado))habilitar=false;
  out.push({...publico(e),habilitada:habilitar,ultimo:progresoPublico(ultimo)});
 }
 return out;
}
async function pruebaParaHacer(intento,exam){
 const {rows}=await db.query(`SELECT p.id,p.enunciado,p.opciones,p.oa_codigo,ep.orden,er.opcion_elegida,er.respuesta_texto,
 p.formato_respuesta,p.respuesta_numerica,p.respuesta_prefijo,p.respuesta_sufijo
 FROM evaluacion_pregunta ep JOIN pregunta p ON p.id=ep.pregunta_id
 LEFT JOIN evaluacion_respuesta er ON er.pregunta_id=p.id AND er.intento_id=$2
 WHERE ep.evaluacion_id=$1 ORDER BY ep.orden`,[exam.id,intento.id]);
 // Nunca se envía la respuesta correcta (respuesta_numerica) al alumno.
 return {evaluacion:publico(exam),intento:progresoPublico(intento),preguntas:rows.map(r=>{
   // Una pregunta ya respondida con alternativa antes de actualizar a v16 se mantiene con alternativas.
   const escrita=esEscrita(exam,r)&&r.opcion_elegida==null;
   return {id:Number(r.id),orden:r.orden,enunciado:r.enunciado,oa:r.oa_codigo,
   formatoRespuesta:escrita?r.formato_respuesta:'alternativas',
   prefijo:escrita?r.respuesta_prefijo||null:null,sufijo:escrita?r.respuesta_sufijo||null:null,
   opciones:escrita?[]:r.opciones.map(o=>({clave:o.clave,texto:o.texto})),
   opcionElegida:r.opcion_elegida||null,respuestaTexto:r.respuesta_texto??null};
 })};
}
async function iniciar(estudianteId,evaluacionId){
 await exigirConsentimiento(estudianteId);
 const {rows:anterior}=await db.query(`SELECT * FROM evaluacion_intento WHERE estudiante_id=$1 AND evaluacion_id=$2 ORDER BY id DESC LIMIT 1`,[estudianteId,evaluacionId]);
 // La prueba antigua desactivada solo puede reabrirse si existe un intento sin entregar.
 const exam=await examenPorId(evaluacionId,db,Boolean(anterior[0]&&!anterior[0].entregado_en));
 if(anterior[0]&&!anterior[0].entregado_en)return pruebaParaHacer(anterior[0],exam);
 if(exam.tipo==='diagnostico'){
  if((await estadoDiagnostico(estudianteId)).estado!=='pendiente')throw conflict('El diagnostico inicial se realiza solo una vez.','DIAGNOSTICO_UNICO');
  const {rows:asig}=await db.query('SELECT curso_id FROM estudiante WHERE id=$1',[estudianteId]);
  if(!asig[0]?.curso_id)throw forbidden('Tu apoderado debe inscribirte en un curso con profesor antes de iniciar el diagnostico.','SIN_DOCENTE_ASIGNADO');
 }else {
  if(!await habilitada(estudianteId,exam))throw forbidden('Esta prueba no esta disponible.','EVALUACION_BLOQUEADA');
  if(anterior[0]?.entregado_en && (!anterior[0].revisado_en||anterior[0].autorizado)) throw conflict('Debes esperar la revision docente o ya terminaste esta evaluacion.','EVALUACION_EN_REVISION');
 }
 // Una evaluacion nueva solo si no existe intento anterior en diagnostico.
 if(exam.tipo==='diagnostico'&&anterior.length)throw conflict('El diagnostico ya fue registrado.','DIAGNOSTICO_UNICO');
 const {rows}=await db.query('INSERT INTO evaluacion_intento(evaluacion_id,estudiante_id) VALUES ($1,$2) RETURNING *',[exam.id,estudianteId]);
 return pruebaParaHacer(rows[0],exam);
}
async function obtener(estudianteId,intentoId){
 const {rows}=await db.query('SELECT * FROM evaluacion_intento WHERE id=$1 AND estudiante_id=$2',[intentoId,estudianteId]);
 if(!rows.length)throw notFound('Intento no encontrado');
 if(rows[0].entregado_en)throw conflict('Esta prueba ya fue entregada.','EVALUACION_ENTREGADA');
 return pruebaParaHacer(rows[0],await examenPorId(rows[0].evaluacion_id,db,true));
}
// v16: entrada = clave de alternativa (string, como antes) o {respuesta,trazos,reconocido,confianza} si es escrita.
async function responder(estudianteId,intentoId,preguntaId,entrada){
 const e2=typeof entrada==='string'?{opcion:entrada}:(entrada||{});
 const {rows}=await db.query(`SELECT i.id,EXTRACT(EPOCH FROM(now()-i.iniciado_en)) AS segundos,e.tiempo_limite_seg,e.respuesta_escrita
 FROM evaluacion_intento i JOIN evaluacion e ON e.id=i.evaluacion_id
 JOIN evaluacion_pregunta ep ON ep.evaluacion_id=e.id AND ep.pregunta_id=$3
 WHERE i.id=$1 AND i.estudiante_id=$2 AND i.entregado_en IS NULL`,[intentoId,estudianteId,preguntaId]);
 if(!rows.length)throw conflict('La pregunta no corresponde a una prueba abierta.','EVALUACION_NO_ABIERTA');
 if(Number(rows[0].segundos)>Number(rows[0].tiempo_limite_seg))throw conflict('Se agoto el tiempo. Entrega tus respuestas guardadas.','TIEMPO_AGOTADO');
 const {rows:op}=await db.query(`SELECT p.opciones,p.formato_respuesta,p.respuesta_numerica,er.opcion_elegida AS previa
   FROM pregunta p LEFT JOIN evaluacion_respuesta er ON er.pregunta_id=p.id AND er.intento_id=$2 WHERE p.id=$1`,[preguntaId,intentoId]);
 if(esEscrita(rows[0],op[0]||{})&&!(op[0].previa!=null&&e2.opcion)){
  const texto=numerica.normalizar(e2.respuesta,op[0].formato_respuesta);
  if(texto==null)throw badRequest(op[0].formato_respuesta==='fraccion'?'Escribe una fracción como 3/4.':'Escribe solo números.','RESPUESTA_INVALIDA');
  await db.query(`INSERT INTO evaluacion_respuesta(intento_id,pregunta_id,opcion_elegida,respuesta_texto,trazos,reconocido,confianza)
   VALUES($1,$2,NULL,$3,$4,$5,$6)
   ON CONFLICT(intento_id,pregunta_id) DO UPDATE SET opcion_elegida=NULL,respuesta_texto=EXCLUDED.respuesta_texto,trazos=EXCLUDED.trazos,
   reconocido=EXCLUDED.reconocido,confianza=EXCLUDED.confianza,respondida_en=now()`,
   [intentoId,preguntaId,texto,e2.trazos?JSON.stringify(e2.trazos):null,e2.reconocido??null,e2.confianza??null]);
  return {guardada:true,respuesta:texto};
 }
 const opcion=e2.opcion;
 if(!op[0]?.opciones.some(o=>o.clave===opcion))throw badRequest('Opcion invalida.','OPCION_INVALIDA');
 await db.query(`INSERT INTO evaluacion_respuesta(intento_id,pregunta_id,opcion_elegida) VALUES($1,$2,$3)
 ON CONFLICT(intento_id,pregunta_id) DO UPDATE SET opcion_elegida=EXCLUDED.opcion_elegida,respuesta_texto=NULL,trazos=NULL,
 reconocido=NULL,confianza=NULL,respondida_en=now()`,[intentoId,preguntaId,opcion]);
 return {guardada:true};
}
async function entregar(estudianteId,intentoId){
 return db.transaction(async client=>{
  const {rows}=await client.query('SELECT * FROM evaluacion_intento WHERE id=$1 AND estudiante_id=$2 FOR UPDATE',[intentoId,estudianteId]);
  const intento=rows[0];if(!intento)throw notFound('Intento no encontrado');
  if(intento.entregado_en)return progresoPublico(intento);
  // Un diagnostico v13 iniciado antes de migrar conserva su correccion al entregarse.
  const exam=await examenPorId(intento.evaluacion_id,client,true);
  // v16: la corrección se hace en JS para comparar respuestas escritas por su valor (3,50 = 3,5; 6/8 = 3/4).
  const {rows:qs}=await client.query(`SELECT p.respuesta_correcta,p.formato_respuesta,p.respuesta_numerica,p.forma_exacta,
     er.opcion_elegida,er.respuesta_texto
    FROM evaluacion_pregunta ep JOIN pregunta p ON p.id=ep.pregunta_id
    LEFT JOIN evaluacion_respuesta er ON er.intento_id=$1 AND er.pregunta_id=p.id
    WHERE ep.evaluacion_id=$2`,[intento.id,exam.id]);
  const corr=qs.map(corregir);
  const total=qs.length,respondidas=corr.filter(c=>c.respondida).length,correctas=corr.filter(c=>c.correcta).length;
  if(total===0)throw conflict('La prueba no tiene preguntas.','EVALUACION_VACIA');
  const segundos=Math.max(1,Math.floor((Date.now()-new Date(intento.iniciado_en).getTime())/1000));
  if(respondidas<total && segundos<exam.tiempo_limite_seg)throw badRequest(`Faltan ${total-respondidas} respuestas.`, 'RESPUESTAS_INCOMPLETAS');
  const pct=Math.round(100*correctas/total);
  // aprobado = sugerencia de correccion automatica, NO decision definitiva del docente.
  const {rows:fin}=await client.query(`UPDATE evaluacion_intento SET entregado_en=now(),correctas=$2,total=$3,
   porcentaje=$4,aprobado=$5,duracion_seg=$6 WHERE id=$1 RETURNING *`,[intento.id,correctas,total,pct,correctas/total>=Number(exam.umbral),Math.min(segundos,exam.tiempo_limite_seg)]);
  const {rows:doc}=await client.query(`SELECT c.docente_id,s.apodo FROM estudiante s JOIN curso c ON c.id=s.curso_id WHERE s.id=$1`,[estudianteId]);
  if(doc[0])await client.query(`INSERT INTO notificacion(docente_id,titulo,mensaje) VALUES($1,$2,$3)`,
    [doc[0].docente_id,'Prueba pendiente de revision',`${doc[0].apodo} ha entregado ${exam.titulo}. Entra a Pruebas a revisar.`]);
  return progresoPublico(fin[0]);
 });
}
async function pendientesDocente(docenteId){
 const {rows}=await db.query(`SELECT i.id,i.correctas,i.total,i.porcentaje,i.duracion_seg,i.entregado_en,i.aprobado,
 e.titulo,e.codigo,e.tipo,e.nivel_id,s.apodo AS estudiante,s.id AS estudiante_id
 FROM evaluacion_intento i JOIN evaluacion e ON e.id=i.evaluacion_id
 JOIN estudiante s ON s.id=i.estudiante_id JOIN curso c ON c.id=s.curso_id
 WHERE c.docente_id=$1 AND i.entregado_en IS NOT NULL AND i.revisado_en IS NULL
 ORDER BY i.entregado_en ASC`,[docenteId]);
 return rows.map(r=>({...r,id:Number(r.id),estudiante_id:Number(r.estudiante_id),porcentaje:Number(r.porcentaje)}));
}
async function revisarDocente(docenteId,intentoId,autorizar,observacion,unidadInicial){
 if(!observacion||!observacion.trim())throw badRequest('El comentario del profesor es obligatorio.','FEEDBACK_OBLIGATORIO');
 return db.transaction(async client=>{
  const {rows}=await client.query(`SELECT i.*,e.tipo,e.nivel_id,e.codigo,c.docente_id,s.apodo FROM evaluacion_intento i
    JOIN evaluacion e ON e.id=i.evaluacion_id JOIN estudiante s ON s.id=i.estudiante_id
    JOIN curso c ON c.id=s.curso_id WHERE i.id=$1 FOR UPDATE OF i`,[intentoId]);
  const i=rows[0];if(!i||Number(i.docente_id)!==docenteId)throw notFound('Revision no encontrada');
  if(!i.entregado_en||i.revisado_en)throw conflict('No hay revision pendiente.','REVISION_NO_PENDIENTE');
  if(i.tipo==='diagnostico'){
   if(!autorizar)throw badRequest('El diagnostico requiere asignar una unidad inicial.','UNIDAD_REQUERIDA');
   if(!Number.isInteger(unidadInicial)||unidadInicial<1||unidadInicial>5)throw badRequest('La unidad inicial debe estar entre 1 y 5.','UNIDAD_INVALIDA');
   const {rows:levels}=await client.query("SELECT id,codigo,orden FROM nivel WHERE codigo LIKE 'SIMCE-U%' ORDER BY orden");
   const nivel=levels[unidadInicial-1];if(!nivel)throw conflict('No hay unidades configuradas.');
   const {rows:first}=await client.query('SELECT id FROM conjunto WHERE nivel_id=$1 AND activo ORDER BY orden LIMIT 1',[nivel.id]);
   if(!first[0])throw conflict('La unidad elegida no tiene hojas.');
   await client.query(`INSERT INTO diagnostico_estado(estudiante_id,estado,unidad_inicial,asignado_por)
     VALUES($1,'asignado',$2,$3) ON CONFLICT(estudiante_id) DO UPDATE SET estado='asignado',unidad_inicial=EXCLUDED.unidad_inicial,asignado_por=EXCLUDED.asignado_por,asignado_en=now()`,[i.estudiante_id,nivel.id,docenteId]);
   await client.query(`INSERT INTO estudiante_posicion(estudiante_id,conjunto_id,punto_partida_id)
     VALUES($1,$2,$2) ON CONFLICT(estudiante_id) DO UPDATE SET conjunto_id=EXCLUDED.conjunto_id,punto_partida_id=EXCLUDED.punto_partida_id,
     cierre_nivel_pendiente=FALSE,requiere_profesor=FALSE,actualizado_en=now()`,[i.estudiante_id,first[0].id]);
   for(const l of levels.filter(l=>l.orden<nivel.orden))await client.query(`INSERT INTO unidad_omitida_diagnostico(estudiante_id,nivel_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[i.estudiante_id,l.id]);
  }else if(autorizar&&i.tipo==='unidad'){
   const {rows:pos}=await client.query('SELECT * FROM estudiante_posicion WHERE estudiante_id=$1 FOR UPDATE',[i.estudiante_id]);
   const {rows:current}=await client.query('SELECT nivel_id FROM conjunto WHERE id=$1',[pos[0]?.conjunto_id]);
   if(!pos[0]?.cierre_nivel_pendiente||Number(current[0]?.nivel_id)!==Number(i.nivel_id))throw conflict('El alumno ya no esta cerrando esta unidad.','UNIDAD_CAMBIADA');
   const {rows:next}=await client.query(`SELECT c.id FROM conjunto c JOIN nivel n ON n.id=c.nivel_id WHERE c.activo
     AND n.orden>(SELECT orden FROM nivel WHERE id=$1) AND n.codigo LIKE 'SIMCE-U%' ORDER BY n.orden,c.orden LIMIT 1`,[i.nivel_id]);
   await client.query(`UPDATE estudiante_posicion SET conjunto_id=$2,cierre_nivel_pendiente=FALSE,
    requiere_profesor=FALSE,actualizado_en=now() WHERE estudiante_id=$1`,[i.estudiante_id,next[0]?.id||pos[0].conjunto_id]);
  }
  await client.query(`UPDATE evaluacion_intento SET revisado_en=now(),revisado_por=$2,autorizado=$3,observacion=$4 WHERE id=$1`,
    [i.id,docenteId,autorizar,observacion.trim()]);
  const next=i.tipo==='diagnostico'?`Comienzas en la unidad ${unidadInicial}.`:
   i.tipo==='final'?'Has terminado el ensayo final.':'Se ha desbloqueado tu siguiente etapa.';
  const titulo=i.tipo==='diagnostico'?'Diagnostico revisado':autorizar?'¡Genial, aprobaste tu examen!':'Puedes volver a intentarlo';
  const mensaje=i.tipo==='diagnostico'?`Tu profesor reviso el diagnostico. ${next} Comentario: ${observacion.trim()}`:
     autorizar?`¡Genial, aprobaste tu examen! ${next} Profesor: ${observacion.trim()}`:
     `Lamentablemente no aprobaste este examen, pero no te rindas. Puedes intentarlo nuevamente. Profesor: ${observacion.trim()}`;
  await client.query('INSERT INTO notificacion(estudiante_id,titulo,mensaje) VALUES($1,$2,$3)',[i.estudiante_id,titulo,mensaje]);
  // Se avisa a los apoderados vinculados, sin exponer respuestas ni notas detalladas.
  await client.query(`INSERT INTO notificacion(apoderado_id,titulo,mensaje)
    SELECT ae.apoderado_id,$2,$3 FROM apoderado_estudiante ae
    WHERE ae.estudiante_id=$1`,[i.estudiante_id,'Evaluación de '+i.apodo+' revisada',
      `El profesor revisó una evaluación de ${i.apodo}. ${autorizar?'El avance fue autorizado.':'Se recomendó continuar practicando.'} Revisa la devolución junto al estudiante.`]);
  return {id:Number(i.id),autorizado:autorizar,observacion:observacion.trim(),unidadInicial:unidadInicial||null};
 });
}

// v15: detalle pregunta por pregunta para el docente del curso (diagnostico, pruebas de unidad y ensayo).
// Solo lo ve el profesor del curso del alumno; el alumno y el apoderado nunca reciben este detalle.
// La unidad sugerida es un apoyo: la decision final la toma el profesor.
const UMBRAL_SUGERENCIA=0.75;
async function detalleDocente(docenteId,intentoId){
 const {rows}=await db.query(`SELECT i.*,e.titulo,e.tipo,e.id AS eval_id,e.respuesta_escrita,s.apodo,c.docente_id
   FROM evaluacion_intento i JOIN evaluacion e ON e.id=i.evaluacion_id
   JOIN estudiante s ON s.id=i.estudiante_id JOIN curso c ON c.id=s.curso_id WHERE i.id=$1`,[intentoId]);
 const i=rows[0];
 if(!i||Number(i.docente_id)!==docenteId)throw notFound('Prueba no encontrada');
 if(!i.entregado_en)throw conflict('La prueba aun no ha sido entregada.','EVALUACION_NO_ENTREGADA');
 const {rows:qs}=await db.query(`SELECT ep.orden,p.enunciado,p.opciones,p.respuesta_correcta,p.oa_codigo,er.opcion_elegida,
   p.formato_respuesta,p.respuesta_numerica,p.respuesta_prefijo,p.respuesta_sufijo,p.forma_exacta,
   er.respuesta_texto,er.trazos,er.reconocido,er.confianza,
   n.orden AS unidad_orden,n.nombre AS unidad_nombre,uo.descripcion AS oa_descripcion
   FROM evaluacion_pregunta ep JOIN pregunta p ON p.id=ep.pregunta_id
   LEFT JOIN evaluacion_respuesta er ON er.intento_id=$1 AND er.pregunta_id=p.id
   LEFT JOIN unidad_oa uo ON uo.oa_codigo=p.oa_codigo
     AND uo.nivel_id IN (SELECT id FROM nivel WHERE codigo LIKE 'SIMCE-U%')
   LEFT JOIN nivel n ON n.id=uo.nivel_id
   WHERE ep.evaluacion_id=$2 ORDER BY ep.orden`,[i.id,i.eval_id]);
 const opcion=(ops,clave)=>{const o=ops.find(x=>x.clave===clave);return o?{clave:o.clave,texto:o.texto}:null;};
 for(const q of qs)q.ok=corregir(q).correcta;
 const preguntas=qs.map(q=>{
  const escrita=q.respuesta_texto!=null||esEscrita(i,q);
  return {
  orden:q.orden,enunciado:q.enunciado,oa:q.oa_codigo,
  unidad:q.unidad_orden==null?null:Number(q.unidad_orden),
  formatoRespuesta:escrita?q.formato_respuesta:'alternativas',
  elegida:q.respuesta_texto!=null?{clave:null,texto:conAfijos(q,q.respuesta_texto)}
   :q.opcion_elegida?opcion(q.opciones,q.opcion_elegida):null,
  correcta:escrita?{clave:null,texto:conAfijos(q,q.respuesta_numerica)}:opcion(q.opciones,q.respuesta_correcta),
  // v16: el docente ve lo que escribió el alumno y lo que leyó el sistema, para detectar errores de lectura.
  escritura:q.respuesta_texto!=null?{trazos:q.trazos||[],reconocido:q.reconocido,
   confianza:q.confianza==null?null:Number(q.confianza),corregidaPorAlumno:q.reconocido!=null&&numerica.normalizar(q.reconocido,q.formato_respuesta)!==q.respuesta_texto}:null,
  esCorrecta:q.ok,
 };});
 const agrupar=(clave,etiqueta)=>{
  const m=new Map();
  for(const q of qs){const k=q[clave];if(k==null)continue;
   const g=m.get(k)||{...etiqueta(q),correctas:0,total:0};g.total++;if(q.ok)g.correctas++;m.set(k,g);}
  return [...m.values()].map(g=>({...g,porcentaje:Math.round(100*g.correctas/g.total)}));
 };
 const porUnidad=agrupar('unidad_orden',q=>({unidad:Number(q.unidad_orden),nombre:q.unidad_nombre})).sort((a,b)=>a.unidad-b.unidad);
 const porOA=agrupar('oa_codigo',q=>({oa:q.oa_codigo,descripcion:q.oa_descripcion,unidad:q.unidad_orden==null?null:Number(q.unidad_orden)}));
 let unidadSugerida=null;
 if(i.tipo==='diagnostico'&&porUnidad.length){
  const debil=porUnidad.find(u=>u.correctas/u.total<UMBRAL_SUGERENCIA);
  unidadSugerida=debil?debil.unidad:porUnidad[porUnidad.length-1].unidad;
 }
 return {intento:{id:Number(i.id),estudiante:i.apodo,titulo:i.titulo,tipo:i.tipo,
   correctas:i.correctas,total:i.total,porcentaje:Number(i.porcentaje),duracionSeg:i.duracion_seg,
   respondidas:preguntas.filter(q=>q.elegida).length},
  porUnidad,porOA,unidadSugerida,umbralSugerencia:Math.round(UMBRAL_SUGERENCIA*100),preguntas};
}
module.exports={catalogo,iniciar,obtener,responder,entregar,pendientesDocente,revisarDocente,detalleDocente,estadoDiagnostico,exigirDiagnostico,aprobadas};
