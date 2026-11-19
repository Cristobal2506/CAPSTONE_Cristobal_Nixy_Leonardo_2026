import {useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,StyleSheet,Text,View} from 'react-native';
import {api,Evaluacion} from '../api';
import {BotonGrande} from '../components/BotonGrande';
import {Mensaje} from '../components/Mensaje';
import {Pantalla} from '../components/Pantalla';
import {colors,sizes} from '../theme';
import {mensajeDeError} from '../validacion';
export function Evaluaciones({onVolver,onAbrir}:{onVolver:()=>void;onAbrir:(id:number)=>void}){
 const [items,setItems]=useState<Evaluacion[]|null>(null),[error,setError]=useState<string|null>(null);
 const cargar=useCallback(async()=>{try{setItems((await api.evaluaciones()).evaluaciones);setError(null);}catch(e){setError(mensajeDeError(e));}},[]);
 useEffect(()=>{void cargar();},[cargar]);
 return <Pantalla centrada={false}><Text style={styles.titulo}>Pruebas y ensayo final</Text>
 <Mensaje tipo="info" texto="Las pruebas de unidad tienen 25 preguntas y 50 minutos. Tu profesor recibe el puntaje y decide si apruebas. No verás resultados hasta que se complete la revisión."/>
 {error?<Mensaje tipo="error" texto={error}/>:null}
 {!items&&!error?<ActivityIndicator color={colors.cordillera}/>:null}
 {items?.map(e=>{
  const r=e.ultimo;
  const espera=Boolean(r?.entregadoEn&&!r.revisadoEn),aprobada=Boolean(r?.revisadoEn&&r.autorizado);
  const status=espera?'⏳ En revisión docente':aprobada?'✔ Aprobada por tu profesor':r?.revisadoEn&&!r.autorizado?'Revisada: puedes intentar de nuevo':r&&!r.entregadoEn?'En curso':e.habilitada?'Disponible':'🔒 Bloqueada';
  return <View key={e.id} style={styles.tarjeta}>
    <Text style={styles.nombre}>{e.titulo}</Text>
    <Text style={styles.meta}>{e.tipo==='final'?'Ensayo integrador':'Prueba final de unidad'} · {Math.round(e.tiempoLimiteSeg/60)} min</Text>
    <Text style={styles.estado}>{status}</Text>
    {r?.revisadoEn?<Text style={styles.meta}>Decisión: {r.autorizado?'Aprobada':'Reprobada'} · {r.porcentaje}% calculado</Text>:null}
    {r?.observacion?<Text style={styles.meta}>Comentario de tu profesor: {r.observacion}</Text>:null}
    {(e.habilitada||r&&!r.entregadoEn)&&!espera&&!aprobada?<BotonGrande titulo={r?.entregadoEn?'Volver a intentar':r?'Continuar examen':'Comenzar examen'} onPress={()=>onAbrir(e.id)}/>:null}
   </View>;
 })}
 <BotonGrande titulo="Actualizar estados" onPress={()=>void cargar()} color={colors.blanco}/>
 <BotonGrande titulo="Volver a mi camino" onPress={onVolver} color={colors.blanco}/></Pantalla>;
}
const styles=StyleSheet.create({titulo:{fontSize:sizes.titulo,color:colors.cordillera,fontWeight:'800',marginBottom:12},tarjeta:{backgroundColor:colors.blanco,padding:16,borderRadius:16,marginVertical:8},nombre:{fontWeight:'800',fontSize:18,color:colors.texto},meta:{fontSize:14,color:colors.textoSuave,marginTop:6},estado:{fontWeight:'800',fontSize:15,color:colors.cordillera,marginTop:7}});
