// v11: CU20/CU22/CU23/CU24, LiveKit React Native integrado en el APK.
// Las salas se autorizan mediante JWT entregados por la API.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SalaLiveKit } from './SalaLiveKit';
import { api, MotivoVideo, SolicitudVideo, OpcionesVideo, Rol } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { Mensaje } from '../components/Mensaje';
import { colors, sizes } from '../theme';

interface Props { rol: Rol; onVolver: () => void }
const ETIQUETAS: Record<MotivoVideo, string> = {
  diagnostico: 'Evaluación diagnóstica con profesor',
  ayuda: 'Necesito ayuda con este conjunto',
  cierre_nivel: 'Examen y cierre de nivel',
};
const ESTADOS: Record<SolicitudVideo['estado'], string> = {
  pendiente: 'Esperando respuesta del profesor',
  aceptada: 'Solicitud aceptada: videollamada disponible',
  finalizada: 'Sesión terminada',
  cancelada: 'Solicitud cancelada',
};

export function Videollamadas({ rol, onVolver }: Props) {
  const estudiante = rol === 'estudiante';
  const [solicitudes, setSolicitudes] = useState<SolicitudVideo[]>([]);
  const [opciones, setOpciones] = useState<OpcionesVideo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [sala, setSala] = useState<{url: string; token: string} | null>(null);

  const actualizar = useCallback(async (mostrarError = true) => {
    try {
      const respuesta = await api.videollamadas();
      setSolicitudes(respuesta.solicitudes);
      if (estudiante) setOpciones((await api.opcionesVideo()).opciones);
      if (mostrarError) setError('');
    } catch (e) {
      if (mostrarError) setError(mensaje(e));
    } finally {
      setCargando(false);
    }
  }, [estudiante]);

  useEffect(() => {
    void actualizar();
    const id = setInterval(() => { void actualizar(false); }, 5000);
    return () => clearInterval(id);
  }, [actualizar]);

  async function ejecutar(fn: () => Promise<unknown>) {
    setOcupado(true); setError(''); setAviso('');
    try { await fn(); await actualizar(false); }
    catch (e) { setError(mensaje(e)); }
    finally { setOcupado(false); }
  }

  const activas = solicitudes.filter((s) => s.estado === 'pendiente' || s.estado === 'aceptada');
  const hayActiva = activas.length > 0;

  const entrar = (id: number) => ejecutar(async () => {
    const datos = await api.accesoVideo(id);
    if (datos.proveedor !== 'livekit' || !/^wss:\/\/[^/]+\/?$/.test(datos.url)
        || !datos.token || !/^RumboSIMCE[a-f0-9]{32}$/.test(datos.sala)) {
      throw new Error('La API entregó credenciales de videollamada inválidas');
    }
    setSala({ url: datos.url, token: datos.token });
  });

  if (sala) {
    return <SalaLiveKit url={sala.url} token={sala.token} onVolver={() => {
      setSala(null); setAviso('Saliste de la llamada. Puedes marcar la solicitud como terminada.');
      void actualizar(false);
    }} />;
  }

  return (
    <View style={styles.raiz}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.titulo}>{estudiante ? 'Hablar con mi profesor' : 'Solicitudes de estudiantes'}</Text>
        <Text style={styles.subtitulo}>
          {estudiante ? 'Solicita acompañamiento para la evaluación o cuando necesitas ayuda.'
            : 'Aquí aparecen las solicitudes pendientes de estudiantes inscritos en tus cursos.'}
        </Text>
        <Mensaje tipo="info" texto="v11: LiveKit integrado en Rumbo SIMCE. Necesita una APK de desarrollo propia (no funciona con Expo Go) y claves LiveKit configuradas solo en el backend." />
        <Mensaje tipo="info" texto="Prototipo académico: probar con adultos y cuentas ficticias. Los permisos de acceso se entregan por un tiempo limitado; finalizar la solicitud no desconecta automáticamente a quien ya está dentro de la sala." />
        {error ? <Mensaje tipo="error" texto={error} /> : null}
        {aviso ? <Mensaje tipo="info" texto={aviso} /> : null}
        {cargando ? <ActivityIndicator size="large" color={colors.cordillera} /> : null}
        {estudiante && !hayActiva && opciones ? (
          <View>
            {(['diagnostico', 'ayuda', 'cierre_nivel'] as MotivoVideo[]).map((motivo) => opciones[motivo] ? (
              <BotonGrande key={motivo} titulo={ETIQUETAS[motivo]} deshabilitado={ocupado}
                onPress={() => void ejecutar(() => api.solicitarVideo(motivo))} />
            ) : null)}
            {!Object.values(opciones).some(Boolean) ?
              <Mensaje tipo="info" texto="Aún no tienes una videollamada habilitada. Podrás solicitar ayuda tras tres tandas sin alcanzar la meta, o cuando debas cerrar un nivel." /> : null}
          </View>
        ) : null}
        {!cargando && !solicitudes.length && !estudiante ? <Mensaje tipo="info" texto="No hay solicitudes pendientes por ahora." /> : null}
        {solicitudes.map((s) => (
          <View key={s.id} style={styles.tarjeta}>
            <Text style={styles.tarjetaTitulo}>{ETIQUETAS[s.motivo]}</Text>
            <Text style={styles.dato}>{estudiante ? `Profesor: ${s.docente}` : `Estudiante: ${s.estudiante}`}</Text>
            <Text style={styles.dato}>{ESTADOS[s.estado]}</Text>
            {s.estado === 'pendiente' && !estudiante ? (
              <BotonGrande titulo="Aceptar y preparar sala LiveKit" deshabilitado={ocupado}
                onPress={() => void ejecutar(() => api.aceptarVideo(s.id))} />
            ) : null}
            {s.estado === 'aceptada' ? (
              <>
                <BotonGrande titulo={estudiante ? 'Entrar a videollamada integrada' : 'Entrar a videollamada integrada'}
                  deshabilitado={ocupado} onPress={() => void entrar(s.id)} />
                <BotonGrande titulo="Marcar sesión como terminada" color={colors.blanco} deshabilitado={ocupado}
                  onPress={() => void ejecutar(() => api.finalizarVideo(s.id))} />
                <Text style={styles.nota}>Ambos deben salir manualmente de la llamada. Marcar la solicitud como terminada impide emitir nuevos tokens, pero no expulsa a personas conectadas.</Text>
              </>
            ) : null}
            {s.estado === 'pendiente' && estudiante ? (
              <BotonGrande titulo="Cancelar solicitud" color={colors.blanco} deshabilitado={ocupado}
                onPress={() => void ejecutar(() => api.cancelarVideo(s.id))} />
            ) : null}
          </View>
        ))}
        <BotonGrande titulo="Actualizar solicitudes" color={colors.blanco} deshabilitado={ocupado} onPress={() => void actualizar()} />
        <BotonGrande titulo="Volver" color={colors.blanco} onPress={onVolver} />
      </ScrollView>
    </View>
  );
}

function mensaje(error: unknown) { return error instanceof Error ? error.message : 'Ocurrió un problema inesperado'; }
const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.cielo },
  contenido: { padding: 22, paddingTop: 56, paddingBottom: 35 },
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera },
  subtitulo: { color: colors.textoSuave, fontSize: 15, marginBottom: 12 },
  tarjeta: { backgroundColor: colors.blanco, borderRadius: 12, padding: 14, marginTop: 12 },
  tarjetaTitulo: { fontSize: 18, fontWeight: '700', color: colors.cordillera },
  dato: { color: colors.textoSuave, fontSize: 15, marginTop: 6 },
  nota: { color: colors.textoSuave, fontSize: 12, marginTop: 8 },
});
