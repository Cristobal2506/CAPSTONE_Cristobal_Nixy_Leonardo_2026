import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

/** Casilla de verificación accesible (área táctil ≥ 48 px, estado anunciado al lector de pantalla). */
export function Casilla({ marcada, onCambiar, texto }: { marcada: boolean; onCambiar: (v: boolean) => void; texto: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      aria-checked={marcada}
      onPress={() => onCambiar(!marcada)}
      style={styles.fila}
    >
      <Text style={[styles.caja, marcada && styles.cajaMarcada]}>{marcada ? '✓' : ''}</Text>
      <Text style={styles.texto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginVertical: 8, gap: 12 },
  caja: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: colors.cordillera,
    textAlign: 'center', lineHeight: 28, fontSize: 20, fontWeight: '800', color: colors.blanco,
    backgroundColor: colors.blanco, overflow: 'hidden',
  },
  cajaMarcada: { backgroundColor: colors.cordillera },
  texto: { flex: 1, fontSize: 17, color: colors.texto },
});
