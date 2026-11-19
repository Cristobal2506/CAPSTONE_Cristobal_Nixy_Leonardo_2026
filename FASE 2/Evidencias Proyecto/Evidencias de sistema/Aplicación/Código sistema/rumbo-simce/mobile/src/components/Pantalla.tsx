// Contenedor común: desplazable y se corre cuando aparece el teclado (pantallas de 5" — RNF-09).
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function Pantalla({ children, centrada = true }: { children: ReactNode; centrada?: boolean }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.contenido, centrada && styles.centrada]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cielo },
  contenido: { flexGrow: 1, padding: 24, paddingTop: 20, maxWidth: 520, width: '100%', alignSelf: 'center' },
  centrada: { justifyContent: 'center' },
});
