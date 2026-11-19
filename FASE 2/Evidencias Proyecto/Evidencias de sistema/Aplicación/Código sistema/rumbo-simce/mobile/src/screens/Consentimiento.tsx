// CU03 — Registrar consentimiento de tratamiento de datos.
// HU-29: antes de aceptar se muestran los datos que se recogen, su finalidad y el plazo de conservación.
// HU-30: al aceptar queda registrado con versión, fecha y hora. También se puede retirar (la revocación queda registrada).
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, Consentimiento as ConsentimientoApi, TextoConsentimiento } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { Casilla } from '../components/Casilla';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { Tarjeta } from '../components/Tarjeta';
import { colors, sizes } from '../theme';
import { mensajeDeError } from '../validacion';

interface Props {
  onVolver: () => void;
  /** Se llama al aceptar: permite seguir directo a crear el perfil del estudiante. */
  onAceptado?: () => void;
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function Consentimiento({ onVolver, onAceptado }: Props) {
  const [texto, setTexto] = useState<TextoConsentimiento | null>(null);
  const [vigente, setVigente] = useState<ConsentimientoApi | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [acepto, setAcepto] = useState(false);
  const [confirmandoRetiro, setConfirmandoRetiro] = useState(false);
  const [estado, setEstado] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setErrorCarga(null);
    try {
      const [t, c] = await Promise.all([api.textoConsentimiento(), api.consentimiento()]);
      setTexto(t);
      // Un consentimiento de una versión anterior del texto no cuenta: hay que aceptar el nuevo.
      setVigente(c.consentimiento && c.consentimiento.version_texto === c.versionVigente ? c.consentimiento : null);
    } catch (e) {
      setErrorCarga(mensajeDeError(e));
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function aceptar() {
    setGuardando(true);
    setEstado(null);
    try {
      const res = await api.aceptarConsentimiento();
      setVigente(res.consentimiento);
      setAcepto(false);
      setEstado({ tipo: 'exito', texto: 'Permiso registrado. Ya puedes crear el perfil de tu hijo o hija.' });
    } catch (e) {
      setEstado({ tipo: 'error', texto: mensajeDeError(e) });
    } finally {
      setGuardando(false);
    }
  }

  async function retirar() {
    setGuardando(true);
    setEstado(null);
    try {
      await api.revocarConsentimiento();
      setVigente(null);
      setConfirmandoRetiro(false);
      setEstado({ tipo: 'exito', texto: 'Retiraste el permiso. Desde ahora no se registran nuevos datos de juego.' });
    } catch (e) {
      setEstado({ tipo: 'error', texto: mensajeDeError(e) });
    } finally {
      setGuardando(false);
    }
  }

  if (!texto) {
    return (
      <Pantalla>
        {errorCarga ? (
          <>
            <Mensaje tipo="error" texto={errorCarga} />
            <BotonGrande titulo="Intentar de nuevo" onPress={cargar} />
          </>
        ) : <ActivityIndicator size="large" color={colors.cordillera} />}
        <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
      </Pantalla>
    );
  }

  return (
    <Pantalla centrada={false}>
      <Text style={styles.titulo} accessibilityRole="header">{texto.titulo}</Text>
      {texto.borrador ? (
        <Mensaje tipo="info" texto={`Texto en revisión (versión ${texto.version}). El definitivo lo valida Triskel Edu.`} />
      ) : null}

      {vigente ? (
        <Mensaje tipo="exito" texto={`Aceptaste este permiso el ${fecha(vigente.otorgado_en)} (versión ${vigente.version_texto}).`} />
      ) : null}

      {texto.secciones.map((s) => (
        <Tarjeta key={s.titulo} titulo={s.titulo}>
          {s.puntos.map((p) => (
            <View key={p} style={styles.punto}>
              <Text style={styles.vineta}>•</Text>
              <Text style={styles.textoPunto}>{p}</Text>
            </View>
          ))}
        </Tarjeta>
      ))}

      {estado ? <Mensaje tipo={estado.tipo} texto={estado.texto} /> : null}

      {!vigente ? (
        <>
          <Casilla marcada={acepto} onCambiar={setAcepto}
            texto="Leí la información y doy permiso para que se usen los datos de mi hijo o hija como se describe." />
          <BotonGrande titulo={guardando ? 'Guardando…' : 'Aceptar y continuar'} onPress={aceptar}
            deshabilitado={!acepto || guardando} />
        </>
      ) : confirmandoRetiro ? (
        <Tarjeta titulo="¿Retirar el permiso?">
          <Text style={styles.textoPunto}>
            Mientras el permiso esté retirado, tu hijo o hija no podrá jugar ni se registrarán nuevos datos. Puedes volver a darlo después.
          </Text>
          <BotonGrande titulo={guardando ? 'Retirando…' : 'Sí, retirar el permiso'} onPress={retirar}
            color={colors.blanco} deshabilitado={guardando} />
          <BotonGrande titulo="No, mantenerlo" onPress={() => setConfirmandoRetiro(false)} />
        </Tarjeta>
      ) : (
        <>
          {onAceptado ? <BotonGrande titulo="Ir a mis estudiantes" onPress={onAceptado} /> : null}
          <BotonGrande titulo="Retirar el permiso" onPress={() => setConfirmandoRetiro(true)} color={colors.blanco} />
        </>
      )}

      <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo - 4, fontWeight: '800', color: colors.cordillera, marginBottom: 8 },
  punto: { flexDirection: 'row', marginBottom: 6 },
  vineta: { fontSize: 17, color: colors.cordillera, marginRight: 8, fontWeight: '800' },
  textoPunto: { flex: 1, fontSize: 17, color: colors.texto, lineHeight: 24 },
});
