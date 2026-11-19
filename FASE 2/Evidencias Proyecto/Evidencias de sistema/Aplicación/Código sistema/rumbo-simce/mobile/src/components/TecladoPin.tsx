// Teclado numérico grande para el PIN del estudiante (HU-03 / RNF01): botones de 72 px,
// sin depender del teclado del sistema, que en un teléfono chico tapa la pantalla.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  valor: string;
  largo?: number;
  onCambiar: (v: string) => void;
  deshabilitado?: boolean;
}

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function TecladoPin({ valor, largo = 4, onCambiar, deshabilitado }: Props) {
  function tocar(t: string) {
    if (deshabilitado) return;
    if (t === '⌫') onCambiar(valor.slice(0, -1));
    else if (valor.length < largo) onCambiar(valor + t);
  }
  return (
    <View>
      <View style={styles.puntos} accessible accessibilityLabel={`PIN: ${valor.length} de ${largo} números escritos`}>
        {Array.from({ length: largo }, (_, i) => (
          <View key={i} style={[styles.punto, i < valor.length && styles.puntoLleno]} />
        ))}
      </View>
      <View style={styles.teclado}>
        {TECLAS.map((t, i) =>
          t === '' ? (
            <View key={i} style={styles.tecla} />
          ) : (
            <Pressable
              key={i}
              onPress={() => tocar(t)}
              disabled={deshabilitado}
              accessibilityRole="button"
              accessibilityLabel={t === '⌫' ? 'Borrar' : t}
              style={({ pressed }) => [styles.tecla, styles.teclaActiva, pressed && styles.presionada]}
            >
              <Text style={styles.textoTecla}>{t}</Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  puntos: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginVertical: 16 },
  punto: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: colors.cordillera },
  puntoLleno: { backgroundColor: colors.cordillera },
  teclado: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300, alignSelf: 'center' },
  tecla: { width: 84, height: 72, margin: 6, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  teclaActiva: { backgroundColor: colors.blanco },
  presionada: { backgroundColor: colors.sol },
  textoTecla: { fontSize: 32, fontWeight: '800', color: colors.cordillera },
});
