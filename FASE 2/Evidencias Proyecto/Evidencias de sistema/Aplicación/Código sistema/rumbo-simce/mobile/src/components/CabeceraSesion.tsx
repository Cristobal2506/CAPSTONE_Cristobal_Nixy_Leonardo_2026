// Rumbo SIMCE v14: acceso a progreso, notificaciones y salir en cabecera.
// Abrir la bandeja marca como vistos los avisos; no elimina el historial.
import {useCallback,useEffect,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {api} from '../api';
import {confirmar} from '../confirmar';
import {colors} from '../theme';
interface Props {
  onAbrirAvisos:()=>void;
  onAbrirProgreso:()=>void;
  onCerrarSesion:()=>void;
  onSalirActividad?:()=>void;
  tipoActividad?:'leccion'|'examen';
  actualizar?:number;
}
export function CabeceraSesion({onAbrirAvisos,onAbrirProgreso,onCerrarSesion,onSalirActividad,tipoActividad,actualizar=0}:Props){
 const [sinLeer,setSinLeer]=useState(0);
 const cargar=useCallback(()=>{api.notificaciones().then(r=>setSinLeer(r.noLeidas)).catch(()=>{});},[]);
 useEffect(()=>{cargar();const timer=setInterval(cargar,15000);return()=>clearInterval(timer);},[cargar,actualizar]);
 async function abrirAvisos(){
  setSinLeer(0);
  try{await api.leerTodasNotificaciones();}catch{ /* El contador se sincronizará en el siguiente sondeo */ }
  onAbrirAvisos();
 }
 const abrirAjustes=()=>Alert.alert('Ajustes de la actividad',
  tipoActividad==='examen'?'Puedes salir del examen y continuar después. Las respuestas guardadas permanecen; el reloj sigue corriendo.':
    'Puedes salir de la lección. Tus respuestas guardadas se conservan.',[
      {text:'Cancelar',style:'cancel'},
      {text:tipoActividad==='examen'?'Salir del examen':'Salir de la lección',style:'destructive',onPress:onSalirActividad},
    ]);
 const confirmarSalir=()=>confirmar('Cerrar sesión','¿Quieres salir de Rumbo SIMCE?','Sí, cerrar sesión',onCerrarSesion);
 return <SafeAreaView edges={['top']} style={styles.area}>
  <View style={styles.barra}>
   <Text style={styles.marca} accessibilityRole="header">Rumbo SIMCE</Text>
   <View style={styles.acciones}>
    <Pressable onPress={onAbrirProgreso} accessibilityRole="button" accessibilityLabel="Ver progreso"
      style={[styles.icono,styles.progreso]}><Text style={styles.iconoTexto}>↗</Text></Pressable>
    <Pressable onPress={()=>void abrirAvisos()} accessibilityRole="button"
      accessibilityLabel={`Notificaciones, ${sinLeer} sin leer`} style={[styles.icono,sinLeer>0&&styles.iconoActivo]}>
      <Text style={styles.emoji}>🔔</Text>
      {sinLeer>0?<View style={styles.insignia}><Text style={styles.numero}>{sinLeer>99?'99+':sinLeer}</Text></View>:null}
    </Pressable>
    <Pressable onPress={confirmarSalir} accessibilityRole="button" accessibilityLabel="Cerrar sesión"
      accessibilityHint="Abre una confirmación para salir" style={[styles.icono,styles.salir]}>
      <Text style={styles.cerrarTexto}>×</Text>
    </Pressable>
    {tipoActividad?<Pressable onPress={abrirAjustes} accessibilityRole="button"
      accessibilityLabel="Ajustes de la actividad" style={styles.icono}>
      <Text style={styles.emoji}>⚙️</Text>
    </Pressable>:null}
   </View>
  </View>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 area:{backgroundColor:colors.cielo,borderBottomColor:'#C8D7E6',borderBottomWidth:1},
 barra:{minHeight:55,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 marca:{fontSize:16,fontWeight:'800',color:colors.cordillera,flexShrink:1},
 acciones:{flexDirection:'row',gap:5,alignItems:'center'},
 icono:{width:41,height:42,borderRadius:21,justifyContent:'center',alignItems:'center',position:'relative'},
 progreso:{backgroundColor:'#DFF5E5',borderWidth:1,borderColor:'#B6D9BF'},
 iconoTexto:{fontSize:28,color:'#21804A',fontWeight:'900'},
 salir:{backgroundColor:'#F6D2D2',borderWidth:1,borderColor:'#E48C8C'},
 cerrarTexto:{fontSize:31,color:'#B92028',fontWeight:'800',lineHeight:36},
 iconoActivo:{backgroundColor:'#FFF3CF',borderColor:'#F5C566',borderWidth:1,elevation:3},
 emoji:{fontSize:22},insignia:{position:'absolute',right:-5,top:-4,minWidth:21,height:21,paddingHorizontal:4,
  borderRadius:11,backgroundColor:'#D83E47',justifyContent:'center',alignItems:'center',borderWidth:2,borderColor:colors.blanco},
 numero:{color:colors.blanco,fontSize:11,fontWeight:'900'},
});
