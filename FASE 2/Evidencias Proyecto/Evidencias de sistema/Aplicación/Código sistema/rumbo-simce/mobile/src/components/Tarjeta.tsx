import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, sizes } from '../theme';

/** Bloque con borde suave y título opcional, usado en los paneles de adultos. */
export function Tarjeta({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <View style={styles.tarjeta}>
      {titulo ? <Text style={styles.titulo} accessibilityRole="header">{titulo}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#F7FBFE', borderRadius: sizes.radio, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#C9DCEB',
  },
  titulo: { fontSize: 20, fontWeight: '700', color: colors.cordillera, marginBottom: 8 },
});
