// CU10 — Mi camino: la progresión lineal Kumon (reemplaza al mapa de islas tras la 2.ª revisión del cliente).
// Niveles en orden; dentro de cada nivel, los conjuntos de hojas: dominados ✔, el actual ▶ y los siguientes 🔒.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Camino, ConjuntoCamino } from '../api';
import { emojiAvatar } from '../avatares';
import { BotonGrande } from '../components/BotonGrande';
import { Mensaje } from '../components/Mensaje';
import { mmss } from '../tiempo';
import { colors, sizes } from '../theme';
import { confirmar } from '../confirmar';

interface Props {
  apodo: string;
  avatar?: string;
  onHacerTanda: (conjuntoId?:number) => void;
  onVideollamadas: () => void;
  onEvaluaciones: () => void;
  onCerrarSesion: () => void;
}

export function MiCamino({ apodo, avatar, onHacerTanda, onVideollamadas, onEvaluaciones, onCerrarSesion }: Props) {
  const [camino, setCamino] = useState<Camino | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(() => {
    setError(false);
    api.camino().then(setCamino).catch(() => setError(true));
  }, []);
  useEffect(cargar, [cargar]);

  const actual = camino?.niveles.flatMap((n) => n.conjuntos).find((c) => c.estado === 'actual');

  return (
    <View style={styles.contenedor}>
      <View style={styles.cabecera}>
        <Text style={styles.avatar} accessibilityLabel="Tu avatar">{emojiAvatar(avatar ?? 'condor')}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.saludo}>¡Hola, {apodo}!</Text>
          <Text style={styles.sub}>Este es tu camino</Text>
        </View>
        {/* v15: salida visible para el alumno (además de la X de la cabecera). */}
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión"
          onPress={() => confirmar('Cerrar sesión', '¿Quieres salir de Rumbo SIMCE?', 'Sí, cerrar sesión', onCerrarSesion)}
          style={styles.salir}>
          <Text style={styles.salirTexto}>Cerrar{'\n'}sesión</Text>
        </Pressable>
      </View>

      {error ? (
        <>
          <Mensaje tipo="error" texto="No pudimos cargar tu camino. Revisa internet." />
          <BotonGrande titulo="Intentar de nuevo" onPress={cargar} />
        </>
      ) : null}
      {!camino && !error ? <ActivityIndicator size="large" color={colors.cordillera} /> : null}

      {camino ? (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
            {camino.cierreNivelPendiente ? (
              <Mensaje tipo="exito" texto="¡Terminaste las hojas de esta unidad! Ahora rinde su prueba; el profesor deberá autorizar el avance." />
            ) : null}
            {camino.requiereProfesor && !camino.cierreNivelPendiente ? (
              <Mensaje tipo="info" texto="Este conjunto te está costando un poco. Pronto lo practicarás con tu profesor." />
            ) : null}
            {camino.niveles.map((n) => (
              <View key={n.id} style={[styles.nivel, n.estado === 'bloqueado' && styles.nivelBloqueado]}>
                <Text style={styles.nivelNombre} accessibilityRole="header">
                  {n.estado === 'dominado' ? '✔ ' : n.estado === 'bloqueado' ? '🔒 ' : n.estado === 'omitido'?'⏭ ':''}{n.nombre}
                </Text>
                {/* v15: una unidad omitida por el diagnóstico se resume en una línea para no tapar la lección actual. */}
                {n.estado === 'omitido' ? (
                  <Text style={styles.omitidaResumen}>Omitida por el diagnóstico inicial · {n.conjuntos.length} lecciones</Text>
                ) : n.conjuntos.map((c, i) => <Paso key={c.id} conjunto={c} ultimo={i === n.conjuntos.length - 1} onIniciar={onHacerTanda}/>)}
              </View>
            ))}
          </ScrollView>
          {camino.ensayoDisponible ? <Mensaje tipo="exito" texto="¡Completaste las cinco unidades! El ensayo final está disponible." /> : null}
        </>
      ) : null}
      <SafeAreaView edges={['bottom']} style={styles.accionesZona}>
        <View style={styles.accionesFila}>
          <Pressable accessibilityRole="button" accessibilityLabel="Hacer la tanda de hoy" disabled={!actual||Boolean(camino?.cierreNivelPendiente)}
            onPress={()=>onHacerTanda()} style={[styles.accionCompacta,(!actual||camino?.cierreNivelPendiente)&&styles.accionDeshabilitada]}>
            <Text style={styles.accionIcono}>▶</Text>
            <Text style={styles.accionTexto}>Hacer la tanda de hoy</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Pruebas de unidad y ensayo final" onPress={onEvaluaciones} style={styles.accionCompacta}>
            <Text style={styles.accionIcono}>✎</Text>
            <Text style={styles.accionTexto}>Pruebas</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Hablar con mi profesor" onPress={onVideollamadas} style={styles.accionCompacta}>
            <Text style={styles.accionIcono}>☏</Text>
            <Text style={styles.accionTexto}>Hablar con el profesor</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Paso({ conjunto: c, ultimo, onIniciar }: { conjunto: ConjuntoCamino; ultimo: boolean; onIniciar:(id?:number)=>void }) {
  const icono = c.estado === 'dominado' ? '✔' : c.estado === 'actual' ? '▶' : c.estado === 'omitido'?'⏭':'🔒';
  const detalle = c.estado === 'omitido'?'Omitida por el diagnóstico inicial':c.estado === 'dominado'
    ? `Dominado${c.mejorTiempoSeg ? ` · mejor tiempo ${mmss(c.mejorTiempoSeg)}` : ''}`
    : c.estado === 'actual'
      // v16.1: si volvió a una lección que ya dominaba, se le dice que al cumplirla sigue avanzando.
      ? c.yaDominado ? `Vuelve a hacerla para seguir avanzando · meta: todo bien en ${mmss(c.tiempoEstandarSeg)}`
      : c.intentos ? `Vas en el intento ${c.intentos + 1} · meta: todo bien en ${mmss(c.tiempoEstandarSeg)}`
        : `Meta: todo bien en ${mmss(c.tiempoEstandarSeg)}`
      : 'Se abre cuando domines el anterior';
  function pulsar(){
    if(c.estado==='dominado')Alert.alert('Repetir lección','¿Quieres volver a jugar esta lección?',[
      {text:'No',style:'cancel'}, {text:'Sí',onPress:()=>onIniciar(c.id)}]);
    else if(c.estado==='actual')onIniciar();
  }
  return (
    <View style={styles.paso} accessibilityLabel={`${c.titulo}. ${detalle}`}>

      <View style={styles.columnaIcono}>
        <Text style={[styles.icono, styles[c.estado]]}>{icono}</Text>
        {!ultimo ? <View style={styles.linea} /> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{disabled:!['dominado','actual'].includes(c.estado)}}
        disabled={!['dominado','actual'].includes(c.estado)} onPress={pulsar}
        style={[styles.tarjeta, c.estado === 'actual' && styles.tarjetaActual]}>
        <Text style={[styles.titulo,c.estado==='bloqueado'&&styles.textoBloqueado]}>{c.titulo}</Text>
        <Text style={styles.detalle}>{detalle}</Text>
        {c.estado==='actual'?<Text style={styles.jugar}>▶ Jugar lección</Text>:null}
        {c.estado==='dominado'?<Text style={styles.jugar}>↻ Volver a practicar</Text>:null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, paddingHorizontal: 14, paddingTop: 18, backgroundColor: colors.cielo },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { fontSize: 38 },
  saludo: { fontSize: 26, fontWeight: '800', color: colors.cordillera },
  sub: { fontSize: sizes.texto - 2, color: colors.textoSuave },
  salir: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1,
    borderColor: '#E48C8C', backgroundColor: '#F6D2D2', justifyContent: 'center', alignItems: 'center' },
  salirTexto: { fontSize: 13, fontWeight: '800', color: '#B92028', textAlign: 'center' },
  omitidaResumen: { fontSize: 15, color: colors.textoSuave, backgroundColor: colors.blanco, borderRadius: sizes.radio,
    padding: 12, marginBottom: 4, marginLeft: 44 },
  accionesZona:{backgroundColor:colors.cielo,paddingTop:7,paddingBottom:3},
  accionesFila:{flexDirection:'row',gap:7,width:'100%'},
  accionCompacta:{flex:1,minWidth:0,minHeight:82,paddingHorizontal:6,paddingVertical:9,borderRadius:14,
    borderWidth:1,borderColor:'#D59A30',backgroundColor:'#F6B441',justifyContent:'center',alignItems:'center'},
  accionDeshabilitada:{opacity:0.42},
  accionIcono:{fontSize:21,fontWeight:'900',color:colors.cordillera},
  accionTexto:{fontSize:12,color:colors.cordillera,fontWeight:'800',textAlign:'center',marginTop:3},
  nivel: { marginTop: 12 },
  nivelBloqueado: { opacity: 0.6 },
  nivelNombre: { fontSize: 20, fontWeight: '800', color: colors.cordillera, marginBottom: 8 },
  paso: { flexDirection: 'row', alignItems: 'stretch' },
  columnaIcono: { width: 44, alignItems: 'center' },
  icono: {
    width: 36, height: 36, borderRadius: 18, textAlign: 'center', lineHeight: 36, fontSize: 18,
    fontWeight: '800', overflow: 'hidden',
  },
  dominado: { backgroundColor: colors.pasto, color: colors.blanco },
  actual: { backgroundColor: colors.sol, color: colors.texto },
  bloqueado: { backgroundColor: colors.blanco, color: colors.textoSuave },
  omitido:{backgroundColor:'#DFE8F1',color:colors.cordillera},
  linea: { width: 4, flex: 1, backgroundColor: colors.blanco, marginVertical: 2 },
  tarjeta: { flex: 1, backgroundColor: colors.blanco, borderRadius: sizes.radio, padding: 14, marginBottom: 10 },
  tarjetaActual: { borderWidth: 3, borderColor: colors.sol },
  titulo: { fontSize: 18, fontWeight: '700', color: colors.texto },
  textoBloqueado: { color: colors.textoSuave },
  detalle: { fontSize: 15, color: colors.textoSuave, marginTop: 4 },
  jugar:{fontSize:15,color:colors.cordillera,fontWeight:'800',marginTop:8},
});
