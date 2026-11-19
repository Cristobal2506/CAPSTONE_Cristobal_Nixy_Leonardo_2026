import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, sizes } from '../theme';

interface Props {
  titulo: string;
  onPress: () => void;
  color?: string;
  deshabilitado?: boolean;
}

export function BotonGrande({ titulo, onPress, color = colors.sol, deshabilitado }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        { backgroundColor: color, opacity: deshabilitado ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.texto}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: sizes.boton,
    borderRadius: sizes.radio,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  texto: { fontSize: sizes.texto, fontWeight: '700', color: colors.texto },
});
