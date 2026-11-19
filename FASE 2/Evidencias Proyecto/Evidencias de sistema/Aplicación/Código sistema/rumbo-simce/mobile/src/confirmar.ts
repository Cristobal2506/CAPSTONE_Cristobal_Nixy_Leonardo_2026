// v15: confirmación común. En Android/iOS usa Alert; en el navegador de desarrollo, window.confirm
// (react-native-web no muestra Alert, lo que impedía probar el cierre de sesión en web).
import { Alert, Platform } from 'react-native';

export function confirmar(titulo: string, mensaje: string, textoSi: string, onSi: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${titulo}\n\n${mensaje}`)) onSi();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'No', style: 'cancel' },
    { text: textoSi, style: 'destructive', onPress: onSi },
  ]);
}
