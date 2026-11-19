import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

/** Acción secundaria con aspecto de enlace (área táctil de al menos 48 px). */
export function Enlace({ titulo, onPress }: { titulo: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.area} hitSlop={8}>
      <Text style={styles.texto}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  texto: { fontSize: 17, color: colors.cordillera, textDecorationLine: 'underline', fontWeight: '600' },
});
