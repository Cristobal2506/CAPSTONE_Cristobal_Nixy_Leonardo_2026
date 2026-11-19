// Aviso de error o de éxito. Lleva ícono y texto además del color (RNF-02: no depender solo del color).
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function Mensaje({ tipo, texto }: { tipo: 'error' | 'exito' | 'info'; texto: string }) {
  const icono = tipo === 'error' ? '⚠' : tipo === 'exito' ? '✔' : 'ℹ';
  return (
    <View style={[styles.caja, styles[tipo]]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.texto}>{icono} {texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { borderRadius: 12, padding: 12, marginVertical: 8, borderLeftWidth: 6 },
  error: { backgroundColor: '#FBE9E7', borderLeftColor: colors.error },
  exito: { backgroundColor: '#E6F4EA', borderLeftColor: colors.pasto },
  info: { backgroundColor: colors.blanco, borderLeftColor: colors.cordillera },
  texto: { fontSize: 16, color: colors.texto },
});
