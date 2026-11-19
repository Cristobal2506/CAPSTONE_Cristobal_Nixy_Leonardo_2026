// Rumbo SIMCE v14 — reportes del camino, por estudiante y por adulto vinculado.
// No se entregan credenciales, respuestas correctas ni resultados de pruebas sin revisar.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { forbidden, notFound } = require('../lib/errors');
const router = express.Router();
router.use(requireAuth);

function personaPublica(r) { return { id: Number(r.id), apodo: r.apodo, avatar: r.avatar }; }

async function acceso(req, estudianteId) {
  if (req.user.rol === 'estudiante') {
    if (Number(req.user.id) !== Number(estudianteId)) throw notFound('Estudiante no encontrado');
    return;
  }
  let sql;
  if (req.user.rol === 'docente') {
    sql = `SELECT 1 FROM estudiante s JOIN curso c ON c.id=s.curso_id
           WHERE s.id=$1 AND c.docente_id=$2`;
  } else if (req.user.rol === 'apoderado') {
    sql = `SELECT 1 FROM apoderado_estudiante ae
           WHERE ae.estudiante_id=$1 AND ae.apoderado_id=$2`;
  } else {
    throw forbidden('No puedes consultar el progreso de este estudiante');
  }
  const {rowCount} = await db.query(sql,[estudianteId,req.user.id]);
  if (!rowCount) throw notFound('Estudiante no encontrado o no asociado');
}

async function reporte(estudianteId) {
  const {rows:alumnos} = await db.query('SELECT id,apodo,avatar FROM estudiante WHERE id=$1',[estudianteId]);
  if (!alumnos.length) throw notFound('Estudiante no encontrado');
  const {rows:lecciones} = await db.query(`
    SELECT n.id AS nivel_id, n.nombre AS unidad, n.orden AS unidad_orden,
           c.id, c.codigo, c.titulo, c.orden, p.conjunto_id AS conjunto_actual,
           COALESCE(h.intentos,0)::int AS intentos,
           COALESCE(h.dominada,FALSE) AS dominada,
           h.mejor_tiempo_seg,
           (o.nivel_id IS NOT NULL) AS omitida
    FROM conjunto c JOIN nivel n ON n.id=c.nivel_id
    LEFT JOIN estudiante_posicion p ON p.estudiante_id=$1
    LEFT JOIN (
       SELECT conjunto_id,COUNT(*) FILTER (WHERE terminado_en IS NOT NULL)::int AS intentos,
              BOOL_OR(COALESCE(cumple_estandar,FALSE)) AS dominada,
              MIN(tiempo_seg) FILTER (WHERE cumple_estandar) AS mejor_tiempo_seg
       FROM intento WHERE estudiante_id=$1 GROUP BY conjunto_id
    ) h ON h.conjunto_id=c.id
    LEFT JOIN unidad_omitida_diagnostico o ON o.estudiante_id=$1 AND o.nivel_id=n.id
    WHERE c.activo AND n.codigo LIKE 'SIMCE-U%'
    ORDER BY n.orden,c.orden`,[estudianteId]);
  const {rows:evaluaciones}=await db.query(`
    SELECT e.titulo,e.tipo,e.codigo,i.id,i.entregado_en,i.revisado_en,
           CASE WHEN i.revisado_en IS NOT NULL THEN i.correctas END AS correctas,
           CASE WHEN i.revisado_en IS NOT NULL THEN i.total END AS total,
           CASE WHEN i.revisado_en IS NOT NULL THEN i.porcentaje END AS porcentaje,
           CASE WHEN i.revisado_en IS NOT NULL THEN i.duracion_seg END AS duracion_seg,
           CASE WHEN i.revisado_en IS NOT NULL THEN i.autorizado END AS autorizado,
           CASE WHEN i.revisado_en IS NOT NULL THEN i.observacion END AS observacion
    FROM evaluacion_intento i JOIN evaluacion e ON e.id=i.evaluacion_id
    WHERE i.estudiante_id=$1 AND i.entregado_en IS NOT NULL
    ORDER BY i.entregado_en DESC,i.id DESC`,[estudianteId]);
  const unidades=[];
  for (const l of lecciones) {
    let u=unidades.find(x=>x.id===Number(l.nivel_id));
    if (!u) {u={id:Number(l.nivel_id),nombre:l.unidad,orden:l.unidad_orden,lecciones:[]};unidades.push(u);}
    const estado=l.omitida?'omitida':l.dominada?'aprobada':Number(l.conjunto_actual)===Number(l.id)?'actual':'pendiente';
    u.lecciones.push({id:Number(l.id),codigo:l.codigo,titulo:l.titulo,estado,
      intentos:l.intentos,mejorTiempoSeg:l.mejor_tiempo_seg==null?null:Number(l.mejor_tiempo_seg)});
  }
  const resumen={totalLecciones:lecciones.length,aprobadas:lecciones.filter(l=>l.dominada&&!l.omitida).length,
    omitidas:lecciones.filter(l=>l.omitida).length,
    pruebasRendidas:evaluaciones.length,pruebasRevisadas:evaluaciones.filter(e=>e.revisado_en).length};
  return {estudiante:personaPublica(alumnos[0]),resumen,unidades,evaluaciones:evaluaciones.map(e=>({
    id:Number(e.id),titulo:e.titulo,tipo:e.tipo,codigo:e.codigo,entregadoEn:e.entregado_en,
    revisadoEn:e.revisado_en,correctas:e.correctas==null?null:Number(e.correctas),
    total:e.total==null?null:Number(e.total),porcentaje:e.porcentaje==null?null:Number(e.porcentaje),
    duracionSeg:e.duracion_seg==null?null:Number(e.duracion_seg),autorizado:e.autorizado,
    observacion:e.observacion
  }))};
}

router.get('/mio',async(req,res)=>{
 if(req.user.rol!=='estudiante') throw forbidden('Esta vista es para estudiantes');
 res.json(await reporte(req.user.id));
});
router.get('/estudiantes',async(req,res)=>{
 let sql;
 if(req.user.rol==='docente') {
   sql=`SELECT DISTINCT s.id,s.apodo,s.avatar FROM estudiante s
        JOIN curso c ON c.id=s.curso_id WHERE c.docente_id=$1 ORDER BY s.apodo`;
 }else if(req.user.rol==='apoderado') {
   sql=`SELECT DISTINCT s.id,s.apodo,s.avatar FROM estudiante s
        JOIN apoderado_estudiante ae ON ae.estudiante_id=s.id
        WHERE ae.apoderado_id=$1 ORDER BY s.apodo`;
 }else throw forbidden('Solo docentes o apoderados pueden listar estudiantes vinculados');
 const {rows}=await db.query(sql,[req.user.id]);
 res.json({estudiantes:rows.map(personaPublica)});
});
router.get('/estudiantes/:id',async(req,res)=>{
 const id=Number(req.params.id);
 if(!Number.isSafeInteger(id)||id<=0) throw notFound('Estudiante no encontrado');
 await acceso(req,id);
 res.json(await reporte(id));
});
module.exports=router;
