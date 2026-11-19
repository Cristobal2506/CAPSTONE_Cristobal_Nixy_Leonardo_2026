// CU11/CU16/CU17 — reporte de aprendizaje para alumno, docente y apoderado.
// Todos los datos provienen del backend; solo se ven las notas después de revisión docente.
import {useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {api,ReporteProgreso,EstudianteProgreso,Rol} from '../api';
import {colors} from '../theme';
import {Mensaje} from '../components/Mensaje';
import {mensajeDeError} from '../validacion';

type Props={rol:Rol;onVolver:()=>void};
export function ProgresoV14({rol,onVolver}:Props){
 const [lista,setLista]=useState<EstudianteProgreso[]|null>(null);
 const [estudiante,setEstudiante]=useState<number|null>(null);
 const [reporte,setReporte]=useState<ReporteProgreso|null>(null);
 const [esperando,setEsperando]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const cargar=useCallback(async()=>{
  setEsperando(true);setError(null);
  try {
   if(rol==='estudiante') setReporte(await api.miProgresoV14());
   else if(rol==='docente'||rol==='apoderado') {
    if(estudiante===null)setLista((await api.estudiantesProgresoV14()).estudiantes);
    else setReporte(await api.reporteEstudianteV14(estudiante));
   } else setError('No hay un reporte asignado para este perfil.');
  }catch(e){setError(mensajeDeError(e));}finally{setEsperando(false);}
 },[rol,estudiante]);
 useEffect(()=>{void cargar();},[cargar]);
 const regresar=()=>{if(estudiante!==null && rol!=='estudiante') {setEstudiante(null);setReporte(null);} else onVolver();};
 return <SafeAreaView edges={['top','bottom']} style={styles.fondo}>
  <View style={styles.barra}>
   <Pressable onPress={regresar} accessibilityLabel="Volver" accessibilityRole="button" style={styles.volver}>
    <Text style={styles.volverTexto}>← Volver</Text>
   </Pressable>
   <Text style={styles.titulo}>↗ Progreso</Text>
   <Pressable onPress={()=>void cargar()} accessibilityLabel="Actualizar progreso" accessibilityRole="button" style={styles.volver}>
    <Text style={styles.volverTexto}>Actualizar</Text>
   </Pressable>
  </View>
  <ScrollView contentContainerStyle={styles.contenido}>
   {esperando?<ActivityIndicator size="large" color={colors.cordillera}/>:null}
   {error?<Mensaje tipo="error" texto={error}/>:null}
   {!esperando&&!error&&lista!==null&&estudiante===null&&rol!=='estudiante'?
    <View>
     <Text style={styles.subtitulo}>Ver progreso de mis estudiantes</Text>
     <Text style={styles.ayuda}>Selecciona un estudiante asociado a tu cuenta para ver sus lecciones y evaluaciones.</Text>
     {lista.length===0?<Mensaje tipo="info" texto="Todavía no tienes estudiantes asociados. Inscríbelos en tus cursos o vincúlalos como apoderado."/>:null}
     {lista.map(a=><Pressable key={a.id} accessibilityRole="button" style={styles.tarjeta}
       onPress={()=>{setReporte(null);setEstudiante(a.id);}}>
       <Text style={styles.nombre}>{a.apodo}</Text><Text style={styles.ver}>Ver progreso →</Text>
     </Pressable>)}
    </View>:null}
   {!esperando&&!error&&reporte?<ReporteDetalle reporte={reporte}/>:null}
  </ScrollView>
 </SafeAreaView>;
}
function ReporteDetalle({reporte:r}:{reporte:ReporteProgreso}){
 const pct=r.resumen.totalLecciones?Math.round(100*(r.resumen.aprobadas+r.resumen.omitidas)/r.resumen.totalLecciones):0;
 return <View>
  <Text style={styles.subtitulo}>Camino de {r.estudiante.apodo}</Text>
  <View style={styles.resumen}>
   <Text style={styles.indicador}>Progreso del camino: {pct}%</Text>
   <View style={styles.pista}><View style={[styles.relleno,{width:`${pct}%` as `${number}%`}]}/></View>
   <Text style={styles.ayuda}>{r.resumen.aprobadas} lecciones aprobadas · {r.resumen.omitidas} omitidas por diagnóstico · {r.resumen.totalLecciones} en total</Text>
   <Text style={styles.ayuda}>{r.resumen.pruebasRendidas} pruebas rendidas · {r.resumen.pruebasRevisadas} revisadas</Text>
  </View>
  <Text style={styles.subtitulo}>Lecciones por unidad</Text>
  {r.unidades.map(u=><View key={u.id} style={styles.tarjeta}>
   <Text style={styles.unidad}>{u.nombre}</Text>
   {u.lecciones.map(l=><View key={l.id} style={styles.leccion}>
    <Text style={styles.leccionTexto}>{l.estado==='aprobada'?'✓':l.estado==='omitida'?'↪':l.estado==='actual'?'▶':'○'} {l.titulo}</Text>
    <Text style={styles.secundario}>{l.estado==='aprobada'?'Aprobada':l.estado==='omitida'?'Omitida por diagnóstico':l.estado==='actual'?'En curso':'Pendiente'}{l.intentos?` · ${l.intentos} intento(s)`:''}</Text>
   </View>)}
  </View>)}
  <Text style={styles.subtitulo}>Pruebas realizadas</Text>
  {r.evaluaciones.length===0?<Mensaje tipo="info" texto="Todavía no se han entregado evaluaciones."/>:null}
  {r.evaluaciones.map(e=><View key={e.id} style={styles.tarjeta}>
   <Text style={styles.unidad}>{e.titulo}</Text>
   <Text style={styles.secundario}>{new Date(e.entregadoEn).toLocaleDateString('es-CL')}</Text>
   {!e.revisadoEn?<Text style={styles.pendiente}>En revisión por el profesor · resultado pendiente</Text>:
    <>
     <Text style={styles.nota}>{e.correctas}/{e.total} correctas · {e.porcentaje}%</Text>
     <Text style={styles.secundario}>Tiempo: {e.duracionSeg==null?'No disponible':`${Math.floor(e.duracionSeg/60)} min ${e.duracionSeg%60} s`}</Text>
     <Text style={e.autorizado?styles.aprobado:styles.pendiente}>{e.autorizado?'Aprobada por el profesor':'No aprobada por el profesor'}</Text>
     {e.observacion?<Text style={styles.feedback}>Comentario docente: {e.observacion}</Text>:null}
    </>}
  </View>)}
 </View>;
}
const styles=StyleSheet.create({
 fondo:{flex:1,backgroundColor:colors.cielo},barra:{paddingHorizontal:12,paddingVertical:11,backgroundColor:colors.blanco,
  flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#D9E5EC'},
 titulo:{fontSize:18,fontWeight:'900',color:'#176B3B'},volver:{padding:10},volverTexto:{color:colors.cordillera,fontWeight:'700'},
 contenido:{paddingHorizontal:16,paddingVertical:20,paddingBottom:40},subtitulo:{fontSize:21,color:colors.cordillera,fontWeight:'900',marginBottom:12,marginTop:10},
 ayuda:{fontSize:14,color:colors.textoSuave,marginTop:8,lineHeight:21},tarjeta:{padding:16,backgroundColor:colors.blanco,borderRadius:16,marginBottom:12,borderWidth:1,borderColor:'#DFE7ED'},
 nombre:{fontSize:18,fontWeight:'800',color:colors.cordillera},ver:{fontSize:15,color:'#19764B',marginTop:8,fontWeight:'700'},
 resumen:{padding:17,borderRadius:15,backgroundColor:colors.blanco,marginBottom:16},indicador:{fontSize:18,fontWeight:'900',color:colors.cordillera},
 pista:{height:10,borderRadius:5,backgroundColor:'#E1E8ED',marginTop:12,overflow:'hidden'},relleno:{height:10,backgroundColor:'#2B9B58'},
 unidad:{fontSize:17,fontWeight:'800',color:colors.cordillera,marginBottom:7},leccion:{paddingVertical:8,borderTopWidth:1,borderTopColor:'#EEF1F4'},
 leccionTexto:{fontSize:15,fontWeight:'600',color:colors.texto},secundario:{fontSize:13,color:colors.textoSuave,marginTop:4},
 nota:{fontSize:20,fontWeight:'800',color:colors.cordillera,marginVertical:6},aprobado:{color:'#177442',fontWeight:'800',marginTop:6},
 pendiente:{color:'#B36616',fontWeight:'700',marginTop:6},feedback:{marginTop:9,color:colors.texto,fontSize:14,lineHeight:21},
});
