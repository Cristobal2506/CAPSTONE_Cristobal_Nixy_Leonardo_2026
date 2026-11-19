// Rumbo SIMCE v11 — Videollamada WebRTC dentro de la misma pantalla React Native.
// No usa WebView, Chrome, Jitsi ni ninguna segunda aplicación Android.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import {
  AudioSession, LiveKitRoom, VideoTrack, isTrackReference, useRoomContext, useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { BotonGrande } from '../components/BotonGrande';
import { Mensaje } from '../components/Mensaje';
import { colors } from '../theme';

interface Props {
  url: string;
  token: string;
  onVolver: () => void;
}

export function SalaLiveKit({ url, token, onVolver }: Props) {
  const [audioListo, setAudioListo] = useState(false);
  const [error, setError] = useState('');
  const [conectado, setConectado] = useState(false);
  const audioIniciado = useRef(false);

  useEffect(() => {
    let activo = true;
    void AudioSession.startAudioSession().then(() => {
      audioIniciado.current = true;
      if (activo) setAudioListo(true);
      else void AudioSession.stopAudioSession();
    }).catch((e: unknown) => {
      if (activo) setError(`No se pudo iniciar el audio: ${mensaje(e)}`);
    });
    return () => {
      activo = false;
      if (audioIniciado.current) void AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <View style={styles.raiz}>
      <Text style={styles.titulo}>Videollamada con mi profesor</Text>
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      {!audioListo && !error ? (
        <View style={styles.cargando}><ActivityIndicator size="large" color={colors.cordillera} />
          <Text>Preparando audio y cámara…</Text></View>
      ) : null}
      {audioListo && !error ? (
        <LiveKitRoom
          serverUrl={url}
          token={token}
          connect={true}
          audio={true}
          video={true}
          options={{ adaptiveStream: { pixelDensity: 'screen' } }}
          onConnected={() => setConectado(true)}
          onDisconnected={() => setConectado(false)}
          onError={(e) => setError(`Error de videollamada: ${mensaje(e)}`)}
        >
          <Text style={styles.estado}>{conectado ? 'Conectado a la sala' : 'Conectando con LiveKit…'}</Text>
          <ContenidoSala />
        </LiveKitRoom>
      ) : null}
      <BotonGrande titulo="Salir de la videollamada" color={colors.blanco} onPress={onVolver} />
      <Text style={styles.nota}>Al salir, vuelve a Rumbo SIMCE. Para cerrar la solicitud de ambos participantes, selecciona «Marcar sesión como terminada».</Text>
    </View>
  );
}

function ContenidoSala() {
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera]);
  const [microfono, setMicrofono] = useState(true);
  const [camara, setCamara] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  async function alternar(tipo: 'microfono' | 'camara') {
    setOcupado(true);
    setAviso('');
    try {
      if (tipo === 'microfono') {
        const habilitar = !room.localParticipant.isMicrophoneEnabled;
        await room.localParticipant.setMicrophoneEnabled(habilitar);
        setMicrofono(room.localParticipant.isMicrophoneEnabled);
      } else {
        const habilitar = !room.localParticipant.isCameraEnabled;
        await room.localParticipant.setCameraEnabled(habilitar);
        setCamara(room.localParticipant.isCameraEnabled);
      }
    } catch (e) { setAviso(mensaje(e)); }
    finally { setOcupado(false); }
  }

  return (
    <View style={styles.sala}>
      <Text style={styles.texto}>Participantes: {room.remoteParticipants.size + 1}</Text>
      <FlatList<TrackReferenceOrPlaceholder>
        data={tracks}
        keyExtractor={(item, idx) => `${item.participant.identity}-${idx}`}
        contentContainerStyle={styles.videos}
        renderItem={({ item }) => (
          <View style={styles.participante}>
            {isTrackReference(item) ? (
              <VideoTrack trackRef={item} style={styles.video} />
            ) : (
              <View style={[styles.video, styles.sinVideo]}><Text>Cámara desactivada</Text></View>
            )}
            <Text style={styles.nombre}>{item.participant.name || 'Participante'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.texto}>Esperando cámaras o participantes…</Text>}
      />
      {aviso ? <Mensaje tipo="error" texto={aviso} /> : null}
      <View style={styles.controles}>
        <View style={styles.mitad}>
          <BotonGrande titulo={microfono ? 'Silenciar' : 'Activar micrófono'}
            deshabilitado={ocupado} onPress={() => void alternar('microfono')} />
        </View>
        <View style={styles.mitad}>
          <BotonGrande titulo={camara ? 'Apagar cámara' : 'Encender cámara'}
            deshabilitado={ocupado} onPress={() => void alternar('camara')} />
        </View>
      </View>
    </View>
  );
}

function mensaje(error: unknown) { return error instanceof Error ? error.message : 'Error inesperado'; }

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.cielo, paddingHorizontal: 14, paddingTop: 45, paddingBottom: 18 },
  titulo: { color: colors.cordillera, fontWeight: '800', fontSize: 23, marginBottom: 9 },
  estado: { textAlign: 'center', color: colors.cordillera, marginVertical: 7, fontWeight: '600' },
  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sala: { flex: 1 },
  texto: { textAlign: 'center', color: colors.textoSuave, marginVertical: 8 },
  videos: { flexGrow: 1, paddingBottom: 8 },
  participante: { flex: 1, marginVertical: 6, backgroundColor: colors.blanco, padding: 6, borderRadius: 12 },
  video: { height: 185, width: '100%', backgroundColor: '#1B2733', borderRadius: 8 },
  sinVideo: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#CEDCE6' },
  nombre: { color: colors.texto, fontSize: 14, fontWeight: '600', textAlign: 'center', marginVertical: 5 },
  controles: { flexDirection: 'row', gap: 8 },
  mitad: { flex: 1 },
  nota: { fontSize: 12, color: colors.textoSuave, marginTop: 5 },
});
