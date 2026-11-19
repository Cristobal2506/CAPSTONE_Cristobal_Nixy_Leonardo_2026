// v13: evaluación con reloj, marcador de dígito, privacidad de resultados y safe-area real.
// v16: las preguntas numéricas se responden escribiendo con el dedo o el lápiz (PreguntaRespuesta).
import {useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {api,PruebaActiva} from '../api';
import {BotonGrande} from '../components/BotonGrande';
import {Mensaje} from '../components/Mensaje';
import {PreguntaRespuesta} from '../components/PreguntaRespuesta';
import {colors} from '../theme';
import {mensajeDeError} from '../validacion';
import {mmss} from '../tiempo';
function TextoDestacado({enunciado}:{enunciado:string}){
 const parts=enunciado.split(/(\[\[[0-9]\]\])/g);
 return <Text style={styles.preguntaTexto}>{parts.map((part,i)=>/^\[\[[0-9]\]\]$/.test(part)
  ?<Text key={i} style={styles.digito}>{part.slice(2,-2)}</Text>
  :<Text key={i}>{part}</Text>)}</Text>;
}
export function RendirEvaluacion({evaluacionId,onVolver}:{evaluacionId:number;onVolver:()=>void}){
 const [prueba,setPrueba]=useState<PruebaActiva|null>(null),[indice,setIndice]=useState(0);
 // Respuesta guardada por pregunta: clave de alternativa o número escrito (v16).
 const [elegidas,setElegidas]=useState<Record<number,string>>({});
 const [dibujando,setDibujando]=useState(false); // bloquea el scroll mientras el alumno escribe
 const [guardando,setGuardando]=useState(false),[terminado,setTerminado]=useState(false);
 const [error,setError]=useState<string|null>(null),[ahora,setAhora]=useState(Date.now());
 const entregaAutomatica=useRef(false);
 const cargar=useCallback(async()=>{
  try{const p=await api.iniciarEvaluacion(evaluacionId);setPrueba(p);setElegidas(Object.fromEntries(p.preguntas.filter(q=>q.opcionElegida||q.respuestaTexto).map(q=>[q.id,(q.opcionElegida??q.respuestaTexto)!])));setError(null);}
  catch(e){setError(mensajeDeError(e));}
 },[evaluacionId]);
 useEffect(()=>{void cargar();},[cargar]);
 useEffect(()=>{const id=setInterval(()=>setAhora(Date.now()),1000);return()=>clearInterval(id);},[]);
 const seg=prueba?Math.max(0,Math.floor((ahora-new Date(prueba.intento.iniciadoEn).getTime())/1000)):0;
 const restante=prueba?Math.max(0,prueba.evaluacion.tiempoLimiteSeg-seg):0;
 const respondidas=prueba?.preguntas.filter(q=>Boolean(elegidas[q.id])).length||0;
 async function guardar(preguntaId:number,opcion:string){
  if(!prueba||guardando||restante===0)return;
  const prev=elegidas[preguntaId];setElegidas(v=>({...v,[preguntaId]:opcion}));setGuardando(true);
  try{await api.responderEvaluacion(prueba.intento.id,preguntaId,opcion);setError(null);}
  catch(e){setElegidas(v=>({...v,[preguntaId]:prev}));setError(mensajeDeError(e));}
  finally{setGuardando(false);}
 }
 async function entregar(forzado=false){
  if(!prueba||guardando||terminado)return;
  if(!forzado && respondidas<prueba.preguntas.length){setError('Responde todas las preguntas antes de entregar.');return;}
  setGuardando(true);setError(null);
  try{await api.entregarEvaluacion(prueba.intento.id);setTerminado(true);}
  catch(e){setError(mensajeDeError(e));entregaAutomatica.current=false;}
  finally{setGuardando(false);}
 }
 useEffect(()=>{
  if(prueba&&restante===0&&!terminado&&!guardando&&!entregaAutomatica.current){
   entregaAutomatica.current=true;void entregar(true);
  }
 },[restante,prueba,terminado,guardando]);
 if(terminado)return <SafeAreaView edges={['bottom']} style={[styles.pantalla,styles.centro]}>
  <Text style={styles.titulo}>¡Genial, has terminado tu examen!</Text>
  <Mensaje tipo="exito" texto="Ahora puedes tomarte un descanso mientras tu profesor revisa tus resultados. Recibirás una notificación con su decisión y comentario."/>
  <BotonGrande titulo="Volver" onPress={onVolver}/>
 </SafeAreaView>;
 if(!prueba)return <SafeAreaView edges={['bottom']} style={[styles.pantalla,styles.centro]}>
  {error?<Mensaje tipo="error" texto={error}/>:<ActivityIndicator size="large" color={colors.cordillera}/>}
  <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco}/>
 </SafeAreaView>;
 const q=prueba.preguntas[indice];
 const escrita=q.formatoRespuesta!=='alternativas';
 return <SafeAreaView edges={['bottom']} style={styles.pantalla}>
  <ScrollView style={{flex:1}} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled" scrollEnabled={!dibujando}>
   <Text style={styles.titulo}>{prueba.evaluacion.titulo}</Text>
   <Text style={styles.meta}>Pregunta {indice+1} de {prueba.preguntas.length} · {respondidas} respondidas</Text>
   <Text style={[styles.meta,restante===0&&styles.sinTiempo]}>⏱ Tiempo restante: {mmss(restante)} / {mmss(prueba.evaluacion.tiempoLimiteSeg)}</Text>
   <View style={styles.pregunta}><TextoDestacado enunciado={q.enunciado}/></View>
   {escrita?<PreguntaRespuesta key={q.id} intentoId={prueba.intento.id}
    pregunta={{...q,respuestaTexto:elegidas[q.id]??null}} deshabilitada={restante===0}
    onDibujando={setDibujando}
    onGuardada={c=>{setElegidas(v=>({...v,[q.id]:c.respuestaTexto!}));setError(null);}}/>
   :q.opciones.map(o=><Pressable key={o.clave} accessibilityRole="radio"
    accessibilityState={{checked:elegidas[q.id]===o.clave,disabled:guardando||restante===0}}
    disabled={guardando||restante===0} onPress={()=>void guardar(q.id,o.clave)}
    style={[styles.opcion,elegidas[q.id]===o.clave&&styles.opcionElegida]}>
    <Text style={styles.opcionTexto}>{o.clave}. {o.texto}</Text>
   </Pressable>)}
   {error?<Mensaje tipo="error" texto={error}/>:null}
  </ScrollView>
  <View style={styles.pie}>
   <View style={styles.fila}>
    {indice>0?<View style={styles.flex}><BotonGrande titulo="← Anterior" onPress={()=>setIndice(x=>x-1)} color={colors.blanco}/></View>:null}
    {indice<prueba.preguntas.length-1?<View style={styles.flex}><BotonGrande titulo="Siguiente →" onPress={()=>setIndice(x=>x+1)}/></View>:null}
   </View>
   {respondidas===prueba.preguntas.length||restante===0?<BotonGrande titulo={guardando?'Enviando…':'Entregar examen'} onPress={()=>void entregar(restante===0)} deshabilitado={guardando}/>:null}

  </View>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 pantalla:{flex:1,backgroundColor:colors.cielo},centro:{justifyContent:'center',padding:24},
 contenido:{padding:18,paddingTop:18,paddingBottom:24,maxWidth:580,width:'100%',alignSelf:'center'},
 titulo:{fontSize:23,fontWeight:'800',color:colors.cordillera,marginBottom:10},
 meta:{fontSize:14,color:colors.textoSuave,marginBottom:8},sinTiempo:{color:'#B33232'},
 pregunta:{backgroundColor:colors.blanco,padding:18,borderRadius:16,marginVertical:12},
 preguntaTexto:{fontSize:21,fontWeight:'700',color:colors.texto,lineHeight:32},
 digito:{color:'#B24700',backgroundColor:'#FFE0A6',fontWeight:'900',textDecorationLine:'underline'},
 opcion:{backgroundColor:colors.blanco,padding:15,borderRadius:14,borderWidth:2,borderColor:'#DAE1EB',marginVertical:5,minHeight:56},
 opcionElegida:{borderColor:colors.cordillera,backgroundColor:'#D2EAFF'},opcionTexto:{fontSize:19,color:colors.texto,fontWeight:'700'},
 pie:{paddingHorizontal:12,paddingTop:8,paddingBottom:8,maxWidth:580,width:'100%',alignSelf:'center',backgroundColor:colors.cielo,gap:4},
 fila:{flexDirection:'row',gap:8},flex:{flex:1},
});
