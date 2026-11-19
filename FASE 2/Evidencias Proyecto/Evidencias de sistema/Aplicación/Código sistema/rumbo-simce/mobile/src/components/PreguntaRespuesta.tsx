// v16: zona de respuesta de una pregunta de evaluación.
// - Pregunta con respuesta numérica en diagnóstico/facsímil → se escribe a mano (RespuestaEscrita).
// - Pregunta que necesita ver las opciones («¿Cuál de los siguientes…?») → alternativas, como antes.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, PreguntaEvaluacion } from '../api';
import { colors } from '../theme';
import { RespuestaEscrita } from './RespuestaEscrita';

export function PreguntaRespuesta({ intentoId, pregunta, onGuardada, deshabilitada, onDibujando }: {
  intentoId: number; pregunta: PreguntaEvaluacion; deshabilitada?: boolean;
  onDibujando?: (activo: boolean) => void; // para bloquear el scroll de la pantalla mientras se escribe
  // Se llama después de guardar en el servidor, para que la pantalla actualice su estado local.
  onGuardada: (cambios: Pick<PreguntaEvaluacion, 'opcionElegida' | 'respuestaTexto'>) => void;
}) {
  if (pregunta.formatoRespuesta !== 'alternativas') {
    return (
      <RespuestaEscrita
        key={pregunta.id}
        formato={pregunta.formatoRespuesta}
        prefijo={pregunta.prefijo} sufijo={pregunta.sufijo}
        guardada={pregunta.respuestaTexto}
        deshabilitada={deshabilitada}
        onDibujando={onDibujando}
        onConfirmar={async (r) => {
          const res = await api.responderEvaluacionEscrita(intentoId, pregunta.id,
            { respuesta: r.texto, trazos: r.trazos, reconocido: r.reconocido, confianza: r.confianza });
          onGuardada({ opcionElegida: null, respuestaTexto: res.respuesta });
        }} />
    );
  }
  return (
    <View style={styles.opciones}>
      {pregunta.opciones.map((o) => {
        const elegida = pregunta.opcionElegida === o.clave;
        return (
          <Pressable key={o.clave} disabled={deshabilitada} accessibilityRole="button" accessibilityState={{ selected: elegida }}
            onPress={async () => { await api.responderEvaluacion(intentoId, pregunta.id, o.clave); onGuardada({ opcionElegida: o.clave, respuestaTexto: null }); }}
            style={[styles.opcion, elegida && styles.opcionElegida]}>
            <Text style={[styles.opcionTexto, elegida && styles.opcionTextoElegida]}>{o.clave}. {o.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  opciones: { gap: 8 },
  opcion: { minHeight: 56, borderRadius: 14, borderWidth: 2, borderColor: '#AABBCD', backgroundColor: colors.blanco, padding: 14, justifyContent: 'center' },
  opcionElegida: { borderColor: colors.cordillera, backgroundColor: colors.cordillera },
  opcionTexto: { fontSize: 18, color: colors.texto, fontWeight: '700' },
  opcionTextoElegida: { color: colors.blanco },
});
