// Campo con etiqueta visible (no solo placeholder) para accesibilidad (RNF-02).
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../theme';

interface Props extends TextInputProps {
  etiqueta: string;
  error?: string | null;
}

export function CampoTexto({ etiqueta, error, style, ...props }: Props) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={colors.textoSuave}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>⚠ {error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginVertical: 6 },
  etiqueta: { fontSize: 16, fontWeight: '600', color: colors.cordillera, marginBottom: 4 },
  input: {
    backgroundColor: colors.blanco, borderRadius: 12, fontSize: 18, padding: 14, color: colors.texto,
    borderWidth: 2, borderColor: 'transparent',
  },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 15, marginTop: 4 },
});
