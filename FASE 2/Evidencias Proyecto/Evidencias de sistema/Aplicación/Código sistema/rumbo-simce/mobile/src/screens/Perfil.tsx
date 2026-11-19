// HU-05 consultar perfil · HU-06 editar perfil (nombre) y cambiar contraseña.
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, Usuario } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { CampoTexto } from '../components/CampoTexto';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { colors, sizes } from '../theme';
import { mensajeDeError, validarNombre, validarPassword } from '../validacion';

interface Props {
  onActualizado: (usuario: Usuario) => void;
  onVolver: () => void;
}

export function Perfil({ onActualizado, onVolver }: Props) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Datos de perfil
  const [nombre, setNombre] = useState('');
  const [estadoNombre, setEstadoNombre] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  // Cambio de contraseña
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [intentoClave, setIntentoClave] = useState(false);
  const [errorActual, setErrorActual] = useState<string | null>(null);
  const [estadoClave, setEstadoClave] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);
  const [guardandoClave, setGuardandoClave] = useState(false);

  useEffect(() => {
    api.me()
      .then((p) => {
        if (p.rol === 'estudiante') return;
        setUsuario(p.usuario);
        setNombre(p.usuario.nombre);
      })
      .catch((e) => setErrorCarga(mensajeDeError(e)));
  }, []);

  async function guardarNombre() {
    setEstadoNombre(null);
    const err = validarNombre(nombre);
    if (err) return setEstadoNombre({ tipo: 'error', texto: err });
    setGuardandoNombre(true);
    try {
      const res = await api.editarNombre(nombre.trim());
      setUsuario(res.usuario);
      setNombre(res.usuario.nombre);
      onActualizado(res.usuario);
      setEstadoNombre({ tipo: 'exito', texto: 'Datos guardados' });
    } catch (e) {
      setEstadoNombre({ tipo: 'error', texto: mensajeDeError(e) });
    } finally {
      setGuardandoNombre(false);
    }
  }

  const erroresClave = {
    actual: actual ? null : 'Escribe tu contraseña actual',
    nueva: validarPassword(nueva) ?? (nueva === actual ? 'Debe ser distinta de la actual' : null),
    confirmacion: confirmacion === nueva ? null : 'Las contraseñas no coinciden',
  };

  async function cambiarClave() {
    setIntentoClave(true);
    setEstadoClave(null);
    setErrorActual(null);
    if (Object.values(erroresClave).some(Boolean)) return;
    setGuardandoClave(true);
    try {
      await api.cambiarPassword(actual, nueva);
      setActual(''); setNueva(''); setConfirmacion(''); setIntentoClave(false);
      setEstadoClave({ tipo: 'exito', texto: 'Contraseña actualizada' });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CONTRASENA_ACTUAL_INCORRECTA') setErrorActual(e.message);
      else setEstadoClave({ tipo: 'error', texto: mensajeDeError(e) });
    } finally {
      setGuardandoClave(false);
    }
  }

  if (!usuario) {
    return (
      <Pantalla>
        {errorCarga ? <Mensaje tipo="error" texto={errorCarga} /> : <ActivityIndicator size="large" color={colors.cordillera} />}
        <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
      </Pantalla>
    );
  }

  const mostrar = (c: keyof typeof erroresClave) => (intentoClave ? erroresClave[c] : null);
  const nombreCambio = nombre.trim() !== usuario.nombre;

  return (
    <Pantalla centrada={false}>
      <Text style={styles.titulo}>Mi perfil</Text>

      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Mis datos</Text>
        <Text style={styles.dato}>Correo: <Text style={styles.valor}>{usuario.email}</Text></Text>
        <Text style={styles.dato}>Tipo de cuenta: <Text style={styles.valor}>
          {usuario.rol === 'docente' ? 'Docente' : 'Apoderado/a'}</Text></Text>
        <CampoTexto etiqueta="Nombre" value={nombre} onChangeText={(t) => { setNombre(t); setEstadoNombre(null); }}
          autoComplete="name" />
        {estadoNombre ? <Mensaje tipo={estadoNombre.tipo} texto={estadoNombre.texto} /> : null}
        <BotonGrande titulo={guardandoNombre ? 'Guardando…' : 'Guardar cambios'} onPress={guardarNombre}
          deshabilitado={guardandoNombre || !nombreCambio} />
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Cambiar contraseña</Text>
        <CampoTexto etiqueta="Contraseña actual" value={actual} onChangeText={(t) => { setActual(t); setErrorActual(null); }}
          secureTextEntry autoComplete="current-password" error={mostrar('actual') ?? errorActual} />
        <CampoTexto etiqueta="Nueva contraseña (mínimo 8 caracteres)" value={nueva} onChangeText={setNueva}
          secureTextEntry autoComplete="new-password" error={mostrar('nueva')} />
        <CampoTexto etiqueta="Repite la nueva contraseña" value={confirmacion} onChangeText={setConfirmacion}
          secureTextEntry autoComplete="new-password" error={mostrar('confirmacion')} />
        {estadoClave ? <Mensaje tipo={estadoClave.tipo} texto={estadoClave.texto} /> : null}
        <BotonGrande titulo={guardandoClave ? 'Guardando…' : 'Cambiar contraseña'} onPress={cambiarClave}
          deshabilitado={guardandoClave} />
      </View>

      <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera, marginBottom: 12 },
  tarjeta: { backgroundColor: '#F7FBFE', borderRadius: sizes.radio, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#C9DCEB' },
  subtitulo: { fontSize: 20, fontWeight: '700', color: colors.cordillera, marginBottom: 8 },
  dato: { fontSize: 16, color: colors.textoSuave, marginBottom: 4 },
  valor: { color: colors.texto, fontWeight: '600' },
});
