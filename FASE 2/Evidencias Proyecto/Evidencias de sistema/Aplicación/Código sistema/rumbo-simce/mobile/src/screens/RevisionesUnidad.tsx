// Bandeja de pruebas enviadas: todas, independientemente del resultado automático.
import {useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,StyleSheet,Text,TextInput,View} from 'react-native';
import {api,RevisionPendiente} from '../api';
import {BotonGrande} from '../components/BotonGrande';
import {Mensaje} from '../components/Mensaje';
import {Pantalla} from '../components/Pantalla';
import {DetalleEvaluacion} from '../components/DetalleEvaluacion';
import {colors,sizes} from '../theme';
import {mmss} from '../tiempo';
import {mensajeDeError} from '../validacion';
export function RevisionesUnidad({onVolver}:{onVolver:()=>void}){
 const [items,setItems]=useState<RevisionPendiente[]|null>(null),[comentarios,setComentarios]=useState<Record<number,string>>({});
 const [unidades,setUnidades]=useState<Record<number,number>>({});
 const [error,setError]=useState<string|null>(null),[guardando,setGuardando]=useState<number|null>(null);
 const cargar=useCallback(async()=>{try{setItems((await api.revisionesPendientes()).pendientes);setError(null);}catch(e){setError(mensajeDeError(e));}},[]);
 useEffect(()=>{void cargar();const id=setInterval(()=>void cargar(),15000);return()=>clearInterval(id);},[cargar]);
 async function revisar(p:RevisionPendiente,autorizar:boolean){
  if(!comentarios[p.id]?.trim()){setError('Debes escribir un comentario de devolución para el estudiante.');return;}
  setError(null);setGuardando(p.id);
  try{await api.revisarEvaluacion(p.id,autorizar,comentarios[p.id],p.tipo==='diagnostico'?(unidades[p.id]||1):undefined);await cargar();}
  catch(e){setError(mensajeDeError(e));}finally{setGuardando(null);}
 }
 return <Pantalla centrada={false}>
  <Text style={styles.titulo}>Pruebas a revisar</Text>
  <Mensaje tipo="info" texto="La aplicación calcula el puntaje como apoyo. Tú decides si apruebas o repruebas, y tu comentario escrito es obligatorio. Los alumnos reciben la decisión solo después de tu revisión."/>
  {error?<Mensaje tipo="error" texto={error}/>:null}
  {!items&&!error?<ActivityIndicator color={colors.cordillera}/>:null}
  {items?.length===0?<Mensaje tipo="exito" texto="No tienes pruebas pendientes."/>:null}
  {items?.map(p=><View key={p.id} style={styles.tarjeta}>
   <Text style={styles.nombre}>{p.estudiante}</Text>
   <Text style={styles.meta}>{p.titulo}</Text>
   <Text style={styles.puntaje}>Corrección automática: {p.correctas}/{p.total} · {p.porcentaje}%</Text>
   <Text style={styles.meta}>Tiempo empleado: {mmss(p.duracion_seg||0)}</Text>
   <DetalleEvaluacion intentoId={p.id} onSugerencia={u=>setUnidades(v=>v[p.id]?v:{...v,[p.id]:u})}/>
   {p.tipo==='diagnostico'?<>
    <Text style={styles.label}>Unidad de partida (se omitirán las anteriores)</Text>
    <View style={styles.opciones}>{[1,2,3,4,5].map(x=><View key={x} style={styles.mini}>
     <BotonGrande titulo={`U${x}${(unidades[p.id]||1)===x?' ✔':''}`} color={(unidades[p.id]||1)===x?colors.sol:colors.blanco}
       onPress={()=>setUnidades(v=>({...v,[p.id]:x}))}/></View>)}</View>
   </>:null}
   <TextInput style={styles.campo} placeholder="Devolución obligatoria al estudiante" placeholderTextColor={colors.textoSuave}
     value={comentarios[p.id]||''} onChangeText={t=>setComentarios(v=>({...v,[p.id]:t}))}
     multiline maxLength={500} accessibilityLabel="Comentario docente obligatorio"/>
   <BotonGrande titulo={p.tipo==='diagnostico'?'Asignar unidad y habilitar camino':'Aprobar examen'}
     deshabilitado={guardando!==null} onPress={()=>void revisar(p,true)}/>
   {p.tipo!=='diagnostico'?<BotonGrande titulo="Reprobar y solicitar nuevo intento" color={colors.blanco}
     deshabilitado={guardando!==null} onPress={()=>void revisar(p,false)}/>:null}
  </View>)}
  <BotonGrande titulo="Actualizar" color={colors.blanco} onPress={()=>void cargar()}/>
  <BotonGrande titulo="Volver" color={colors.blanco} onPress={onVolver}/>
 </Pantalla>;
}
const styles=StyleSheet.create({titulo:{fontSize:sizes.titulo,fontWeight:'800',color:colors.cordillera},tarjeta:{backgroundColor:colors.blanco,borderRadius:16,padding:16,marginVertical:10},nombre:{fontSize:20,fontWeight:'800',color:colors.cordillera},puntaje:{fontSize:17,color:colors.texto,fontWeight:'800',marginVertical:8},meta:{fontSize:15,color:colors.texto,lineHeight:24},campo:{borderRadius:12,borderWidth:1,borderColor:'#AABBCD',color:colors.texto,marginVertical:12,padding:14,minHeight:90,textAlignVertical:'top'},label:{fontWeight:'700',color:colors.cordillera,marginTop:12,marginBottom:8},opciones:{flexDirection:'row',flexWrap:'wrap',gap:4},mini:{width:'30%'}});
