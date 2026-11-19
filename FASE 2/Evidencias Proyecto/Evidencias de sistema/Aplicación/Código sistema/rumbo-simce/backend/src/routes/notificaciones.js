const express=require('express');
const db=require('../db');
const {requireAuth}=require('../middleware/auth');
const {idParam}=require('../lib/params');
const router=express.Router();router.use(requireAuth);
router.get('/',async(req,res)=>{
 const col=req.user.rol==='estudiante'?'estudiante_id':req.user.rol==='docente'?'docente_id':req.user.rol==='apoderado'?'apoderado_id':null;
 if(!col)return res.json({notificaciones:[],noLeidas:0});
 const {rows}=await db.query(`SELECT id,titulo,mensaje,leida,creada_en FROM notificacion WHERE ${col}=$1 ORDER BY creada_en DESC LIMIT 50`,[req.user.id]);
 res.json({notificaciones:rows.map(r=>({...r,id:Number(r.id)})),noLeidas:rows.filter(r=>!r.leida).length});
});
// Abrir la campanita equivale a ver la bandeja: vacía el contador sin borrar el historial.
router.post('/leer-todas',async(req,res)=>{
 const col=req.user.rol==='estudiante'?'estudiante_id':req.user.rol==='docente'?'docente_id':req.user.rol==='apoderado'?'apoderado_id':null;
 if(!col)return res.status(403).json({error:{code:'NO_AUTORIZADO',message:'No autorizado'}});
 const {rowCount}=await db.query(`UPDATE notificacion SET leida=TRUE WHERE ${col}=$1 AND leida=FALSE`,[req.user.id]);
 res.json({marcadas:rowCount,noLeidas:0});
});
router.post('/:id/leer',async(req,res)=>{
 const col=req.user.rol==='estudiante'?'estudiante_id':req.user.rol==='docente'?'docente_id':req.user.rol==='apoderado'?'apoderado_id':null;
 if(!col)return res.status(403).json({error:{code:'NO_AUTORIZADO',message:'No autorizado'}});
 const {rowCount}=await db.query(`UPDATE notificacion SET leida=TRUE WHERE id=$1 AND ${col}=$2`,[idParam(req),req.user.id]);
 if(!rowCount)return res.status(404).json({error:{code:'NO_ENCONTRADO',message:'Aviso no encontrado'}});
 res.json({leida:true});
});
module.exports=router;
