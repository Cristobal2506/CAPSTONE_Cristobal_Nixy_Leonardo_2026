import {useCallback,useEffect,useState} from 'react';
import {Text,StyleSheet,View,Pressable} from 'react-native';
import {api} from '../api';
import {Pantalla} from '../components/Pantalla';
import {BotonGrande} from '../components/BotonGrande';
import {Mensaje} from '../components/Mensaje';
import {colors} from '../theme';
import {mensajeDeError} from '../validacion';
type Aviso={id:number,titulo:string,mensaje:string,leida:boolean,creada_en:string};
export function Notificaciones({onVolver}:{onVolver:()=>void}){
 const [avisos,setAvisos]=useState<Aviso[]>([]),[error,setError]=useState<string|null>(null);
 const cargar=useCallback(async()=>{try{setAvisos((await api.notificaciones()).notificaciones);setError(null);}catch(e){setError(mensajeDeError(e));}},[]);
 useEffect(()=>{void cargar();const id=setInterval(()=>void cargar(),15000);return()=>clearInterval(id);},[cargar]);
 return <Pantalla centrada={false}>
  <Pressable onPress={onVolver} accessibilityRole="button" accessibilityLabel="Volver a la aplicación"
   style={styles.volverArriba}><Text style={styles.volverTexto}>← Volver</Text></Pressable>
  <Text style={styles.titulo}>Notificaciones</Text>
  <Mensaje tipo="info" texto="Estos avisos se actualizan dentro de Rumbo SIMCE. No requieren notificaciones push ni instalar aplicaciones adicionales."/>
  {error?<Mensaje tipo="error" texto={error}/>:null}
  {avisos.length===0?<Text style={styles.vacio}>Todavía no hay avisos.</Text>:null}
  {avisos.map(a=><View key={a.id} style={[styles.tarjeta,!a.leida&&styles.nueva]}>
   <Text style={styles.nombre}>{a.leida?'':'🔔 '}{a.titulo}</Text><Text style={styles.msg}>{a.mensaje}</Text>
   <Text style={styles.fecha}>{new Date(a.creada_en).toLocaleString('es-CL')}</Text>
   {!a.leida?<BotonGrande titulo="Marcar como leído" color={colors.blanco} onPress={async()=>{try{await api.leerNotificacion(a.id);await cargar();}catch(e){setError(mensajeDeError(e));}}}/>:null}
  </View>)}
  <BotonGrande titulo="Actualizar" onPress={()=>void cargar()}/><BotonGrande titulo="Volver" color={colors.blanco} onPress={onVolver}/>
 </Pantalla>;
}
const styles=StyleSheet.create({volverArriba:{paddingVertical:12},volverTexto:{fontSize:17,fontWeight:'800',color:colors.cordillera},titulo:{fontSize:26,fontWeight:'800',color:colors.cordillera,marginBottom:12},vacio:{fontSize:16,color:colors.textoSuave,margin:14},tarjeta:{padding:16,borderRadius:14,backgroundColor:colors.blanco,marginVertical:8},nueva:{borderWidth:2,borderColor:colors.sol},nombre:{fontSize:19,fontWeight:'800',color:colors.cordillera},msg:{fontSize:16,color:colors.texto,lineHeight:23,marginTop:7},fecha:{fontSize:13,color:colors.textoSuave,marginTop:8}});
