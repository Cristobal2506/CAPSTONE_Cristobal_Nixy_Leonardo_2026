// v13: puerta de entrada obligatoria para alumnos nuevos.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { Pantalla } from '../components/Pantalla';
import { BotonGrande } from '../components/BotonGrande';
import { Mensaje } from '../components/Mensaje';
import { colors } from '../theme';
import { mensajeDeError } from '../validacion';
interface Props {onContinuar:()=>void;onRendir:(id:number)=>void;onSalir:()=>void}
export function DiagnosticoInicio({onContinuar,onRendir,onSalir}:Props){
 const [estado,setEstado]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [id,setId]=useState<number|null>(null);
 const cargar=useCallback(async()=>{
  setError(null);
  try{
   const [e,ex]=await Promise.all([api.estadoDiagnostico(),api.diagnostico()]);
   setEstado(e.estado);setId(ex.id);
  }catch(e){setError(mensajeDeError(e));}
 },[]);
 useEffect(()=>{void cargar();const t=setInterval(()=>void cargar(),15000);return()=>clearInterval(t);},[cargar]);
 // Al entrar con un diagnostico ya revisado se abre el camino automáticamente.
 useEffect(()=>{if(estado==='asignado'||estado==='exento')onContinuar();},[estado,onContinuar]);
 return <Pantalla>
  <Text style={styles.titulo}>Tu punto de partida</Text>
  <Mensaje tipo="info" texto="Para comenzar, realizarás una prueba de diagnóstico de Matemática: 40 preguntas y 60 minutos. No se repite. Después tu profesor revisará las respuestas y elegirá la unidad desde la que comenzarás."/>
  {!estado&&!error?<ActivityIndicator color={colors.cordillera}/>:null}
  {error?<Mensaje tipo="error" texto={error}/>:null}
  {estado==='pendiente'? <>
    <Text style={styles.sub}>Cuando estés listo, inicia tu diagnóstico. Responde con calma: no es una competencia.</Text>
    <BotonGrande titulo="Comenzar diagnóstico" deshabilitado={!id} onPress={()=>id&&onRendir(id)} />
   </>:null}
  {estado==='en_curso'?<><Mensaje tipo="info" texto="Tienes una prueba en curso. Puedes retomarla, pero el reloj continúa desde el primer ingreso."/>
    <BotonGrande titulo="Continuar diagnóstico" deshabilitado={!id} onPress={()=>id&&onRendir(id)}/></>:null}
  {estado==='en_revision'?<><Mensaje tipo="exito" texto="¡Genial, terminaste tu examen! Descansa mientras tu profesor revisa tus resultados. El camino se habilitará cuando te asigne una unidad."/>
   </>:null}
  <BotonGrande titulo="Actualizar estado" color={colors.blanco} onPress={()=>void cargar()}/>
  <BotonGrande titulo="Cerrar sesión" color={colors.blanco} onPress={onSalir}/>
 </Pantalla>;
}
const styles=StyleSheet.create({titulo:{fontSize:26,fontWeight:'800',color:colors.cordillera,marginBottom:16},sub:{fontSize:17,color:colors.texto,marginVertical:14,lineHeight:25}});
