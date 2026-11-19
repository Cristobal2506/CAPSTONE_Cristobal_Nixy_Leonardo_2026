import { Image, StyleSheet, Text, View } from 'react-native';
import { BotonGrande } from '../components/BotonGrande';
import { colors, sizes } from '../theme';

interface Props {
  onEstudiante: () => void;
  onAdulto: () => void;
}

export function Bienvenida({ onEstudiante, onAdulto }: Props) {
  return (
    <View style={styles.contenedor}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} accessibilityLabel="Logo de Rumbo SIMCE" />
      <Text style={styles.titulo}>Rumbo SIMCE</Text>
      <Text style={styles.subtitulo}>¡Hola! ¿Quién va a estudiar hoy?</Text>
      <BotonGrande titulo="Soy estudiante" onPress={onEstudiante} />
      <BotonGrande titulo="Soy apoderado o docente" onPress={onAdulto} color={colors.blanco} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.cielo },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 16 },
  titulo: { fontSize: sizes.titulo + 6, fontWeight: '800', textAlign: 'center', color: colors.cordillera },
  subtitulo: { fontSize: sizes.texto, textAlign: 'center', color: colors.textoSuave, marginBottom: 32, marginTop: 8 },
});
