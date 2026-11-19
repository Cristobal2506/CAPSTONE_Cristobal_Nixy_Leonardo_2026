const express=require('express');
const {z}=require('zod');
const {requireAuth,requireRole}=require('../middleware/auth');
const {validate}=require('../middleware/validate');
const {idParam}=require('../lib/params');
const evaluaciones=require('../lib/evaluaciones');
const router=express.Router();
router.use(requireAuth,requireRole('estudiante'));
router.get('/diagnostico',async(req,res)=>{
 // Si un alumno comenzo un diagnostico v13 antes de actualizar, debe poder finalizarlo
 // con las preguntas originales. Nuevos alumnos reciben exclusivamente V131.
 const {rows}=await require('../db').query(`
   SELECT e.id,e.titulo FROM evaluacion_intento i
   JOIN evaluacion e ON e.id=i.evaluacion_id
   WHERE e.tipo='diagnostico' AND i.estudiante_id=$1 AND i.entregado_en IS NULL
   ORDER BY i.id DESC LIMIT 1`,[req.user.id]);
 if(!rows.length){
   const {rows:activas}=await require('../db').query(
     "SELECT id,titulo FROM evaluacion WHERE tipo='diagnostico' AND activa ORDER BY id DESC LIMIT 1");
   rows.push(...activas);
 }
 if(!rows.length)return res.status(503).json({error:{code:'SIN_DIAGNOSTICO',message:'Ejecuta npm run db:seed'}});
 res.json({id:Number(rows[0].id),titulo:rows[0].titulo});
});
router.get('/diagnostico/estado',async(req,res)=>res.json(await evaluaciones.estadoDiagnostico(req.user.id)));
router.get('/',async(req,res)=>res.json({evaluaciones:await evaluaciones.catalogo(req.user.id)}));
router.post('/:id/iniciar',async(req,res)=>res.status(201).json(await evaluaciones.iniciar(req.user.id,idParam(req))));
router.get('/intentos/:id',async(req,res)=>res.json(await evaluaciones.obtener(req.user.id,idParam(req))));
// v16: la respuesta es una alternativa (opcion) o un número escrito a mano y ya confirmado por el alumno (respuesta).
const esquemaTrazos=require('../lib/reconocimiento/esquema');
const respuestaSchema=z.object({
 preguntaId:z.number().int().positive(),
 opcion:z.enum(['A','B','C','D']).optional(),
 respuesta:z.string().trim().min(1).max(20).optional(),
 trazos:z.array(esquemaTrazos.trazos).min(1).max(2).optional(), // 2 lienzos en una fracción
 reconocido:z.string().max(20).optional(),
 confianza:z.number().min(0).max(1).optional(),
}).refine(b=>Boolean(b.opcion)!==Boolean(b.respuesta),{message:'Envía una alternativa o un número escrito.'});
router.put('/intentos/:id/respuesta',validate(respuestaSchema),async(req,res)=>{
 const {preguntaId,opcion,...escrita}=req.body;
 res.json(await evaluaciones.responder(req.user.id,idParam(req),preguntaId,opcion??escrita));
});
router.post('/intentos/:id/entregar',async(req,res)=>res.json({resultado:await evaluaciones.entregar(req.user.id,idParam(req))}));
module.exports=router;
