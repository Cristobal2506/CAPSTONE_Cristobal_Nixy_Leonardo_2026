// v16: lienzo para escribir un número con el dedo o con el lápiz de la tablet.
// Captura los trazos como vectores (lista de puntos), que es lo que usa el reconocedor del servidor.
import { useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { TramosTrazo, Trazo } from './Trazos';

const GROSOR = 7;
const MAX_TRAZOS = 40;
const MAX_PUNTOS = 600;

export function PizarraNumero({ trazos, onCambio, alto = 170, deshabilitada, etiqueta, onDibujando }:
  { trazos: Trazo[]; onCambio: (t: Trazo[]) => void; alto?: number; deshabilitada?: boolean; etiqueta?: string;
    onDibujando?: (activo: boolean) => void }) {
  const [actual, setActual] = useState<Trazo | null>(null);
  const actualRef = useRef<Trazo | null>(null);
  const origen = useRef({ x: 0, y: 0 });
  const vista = useRef<View>(null);
  const [ancho, setAncho] = useState(0);

  // Se usa pageX/pageY menos la posición del lienzo: en Android locationX cambia
  // de referencia cuando el dedo pasa sobre un trazo ya dibujado.
  const punto = (e: GestureResponderEvent): [number, number] => {
    const x = e.nativeEvent.pageX - origen.current.x, y = e.nativeEvent.pageY - origen.current.y;
    return [Math.round(Math.max(0, Math.min(ancho || x, x)) * 10) / 10, Math.round(Math.max(0, Math.min(alto, y)) * 10) / 10];
  };
  function empezar(e: GestureResponderEvent) {
    const { pageX, pageY, locationX, locationY } = e.nativeEvent;
    origen.current = { x: pageX - locationX, y: pageY - locationY }; // el primer toque cae sobre el fondo del lienzo
    actualRef.current = [[locationX, locationY]];
    setActual(actualRef.current);
    onDibujando?.(true);
  }
  function mover(e: GestureResponderEvent) {
    const t = actualRef.current; if (!t || t.length >= MAX_PUNTOS) return;
    const p = punto(e), u = t[t.length - 1];
    if (Math.hypot(p[0] - u[0], p[1] - u[1]) < 2.5) return; // descarta micro-movimientos
    actualRef.current = [...t, p];
    setActual(actualRef.current);
  }
  function terminar() {
    const t = actualRef.current; actualRef.current = null; setActual(null);
    onDibujando?.(false);
    if (t && trazos.length < MAX_TRAZOS) onCambio([...trazos, t]);
  }

  return (
    <View>
      {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}
      <View ref={vista} collapsable={false}
        style={[styles.lienzo, { height: alto }, deshabilitada && styles.deshabilitada]}
        onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => !deshabilitada}
        onMoveShouldSetResponder={() => !deshabilitada}
        onResponderTerminationRequest={() => false} // que el ScrollView no "robe" el trazo
        onResponderGrant={empezar} onResponderMove={mover} onResponderRelease={terminar} onResponderTerminate={terminar}
        accessibilityLabel={etiqueta ?? 'Espacio para escribir tu respuesta'} accessibilityHint="Escribe el número con el dedo o con el lápiz">
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.renglon, { top: alto * 0.78 }]} />
          {trazos.length === 0 && !actual ? <Text style={styles.ayuda}>Escribe aquí ✏️</Text> : null}
          {trazos.map((t, i) => <TramosTrazo key={i} trazo={t} grosor={GROSOR} color={colors.cordillera} />)}
          {actual ? <TramosTrazo trazo={actual} grosor={GROSOR} color={colors.cordillera} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: { fontSize: 15, fontWeight: '800', color: colors.cordillera, marginBottom: 4 },
  lienzo: { backgroundColor: colors.blanco, borderRadius: 16, borderWidth: 2, borderColor: '#AABBCD', borderStyle: 'dashed', overflow: 'hidden' },
  deshabilitada: { opacity: 0.6 },
  renglon: { position: 'absolute', left: 16, right: 16, height: 1, backgroundColor: '#D5DEE7' },
  ayuda: { position: 'absolute', alignSelf: 'center', top: '38%', fontSize: 18, color: colors.textoSuave },
});
