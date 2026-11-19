// CU01 / HU-03 — Ingreso del estudiante, simple y visual (máximo dos pasos):
//   1) toca su avatar (el teléfono recuerda a quienes ya entraron o su apoderado dejó listos)
//   2) escribe su PIN en un teclado grande; al cuarto número entra solo.
// La primera vez en un teléfono entra con su código de 6 letras (lo tiene su apoderado).
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError, Estudiante } from '../api';
import { emojiAvatar } from '../avatares';
import { BotonGrande } from '../components/BotonGrande';
import { Enlace } from '../components/Enlace';
import { TecladoPin } from '../components/TecladoPin';
import { leerPerfiles, olvidarPerfil, PerfilDispositivo, recordarPerfil } from '../perfilesDispositivo';
import { colors, sizes } from '../theme';

interface Props {
  onEntrar: (token: string, estudiante: Estudiante) => void;
  onVolver: () => void;
}

type Paso =
  | { tipo: 'cargando' }
  | { tipo: 'elegir' }
  | { tipo: 'codigo' }
  | { tipo: 'pin'; perfil: PerfilDispositivo; recordado: boolean };

export function LoginEstudiante({ onEntrar, onVolver }: Props) {
  const [perfiles, setPerfiles] = useState<PerfilDispositivo[]>([]);
  const [paso, setPaso] = useState<Paso>({ tipo: 'cargando' });
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    leerPerfiles().then((ps) => {
      setPerfiles(ps);
      setPaso(ps.length ? { tipo: 'elegir' } : { tipo: 'codigo' });
    });
  }, []);

  const irA = (p: Paso) => { setError(null); setPin(''); setPaso(p); };

  // Al completar los 4 números se intenta entrar, sin botón extra.
  useEffect(() => {
    if (paso.tipo === 'pin' && pin.length === 4 && !cargando) void entrar(paso.perfil);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function entrar(perfil: PerfilDispositivo) {
    setError(null);
    setCargando(true);
    try {
      const res = await api.loginEstudiante(perfil.codigo, pin);
      await recordarPerfil({ codigo: perfil.codigo, apodo: res.estudiante.apodo, avatar: res.estudiante.avatar });
      onEntrar(res.token, res.estudiante);
    } catch (e) {
      setPin('');
      if (e instanceof ApiError && e.status === 401) setError('Ups, ese PIN no es. ¡Inténtalo otra vez!');
      else if (e instanceof ApiError && e.status === 423) setError(`⏳ ${e.message}`); // HU-04: bloqueo temporal
      else setError('No pudimos conectarnos. Revisa internet.');
    } finally {
      setCargando(false);
    }
  }

  if (paso.tipo === 'cargando') return <View style={styles.contenedor} />;

  // Paso 1 — ¿quién va a estudiar?
  if (paso.tipo === 'elegir') {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.titulo} accessibilityRole="header">¿Quién va a estudiar?</Text>
        <View style={styles.grilla}>
          {perfiles.map((p) => (
            <Pressable
              key={p.codigo}
              onPress={() => irA({ tipo: 'pin', perfil: p, recordado: true })}
              accessibilityRole="button"
              accessibilityLabel={`Soy ${p.apodo}`}
              style={({ pressed }) => [styles.perfil, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.perfilAvatar}>{emojiAvatar(p.avatar)}</Text>
              <Text style={styles.perfilNombre} numberOfLines={1}>{p.apodo}</Text>
            </Pressable>
          ))}
        </View>
        <Enlace titulo="No estoy aquí: entrar con mi código" onPress={() => irA({ tipo: 'codigo' })} />
        <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
      </View>
    );
  }

  // Primera vez en este teléfono — código de acceso
  if (paso.tipo === 'codigo') {
    const listo = codigo.trim().length === 6;
    return (
      <View style={styles.contenedor}>
        <Text style={styles.titulo} accessibilityRole="header">Tu código secreto</Text>
        <Text style={styles.ayuda}>Son 6 letras y números. Te lo da tu apoderado.</Text>
        <TextInput
          style={styles.input}
          value={codigo}
          onChangeText={(t) => setCodigo(t.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ABC123"
          accessibilityLabel="Código de acceso"
          onSubmitEditing={() => listo && irA({ tipo: 'pin', perfil: { codigo: codigo.trim(), apodo: '', avatar: '' }, recordado: false })}
        />
        <BotonGrande titulo="Seguir" deshabilitado={!listo}
          onPress={() => irA({ tipo: 'pin', perfil: { codigo: codigo.trim(), apodo: '', avatar: '' }, recordado: false })} />
        <BotonGrande titulo="Volver" onPress={() => (perfiles.length ? irA({ tipo: 'elegir' }) : onVolver())}
          color={colors.blanco} />
      </View>
    );
  }

  // Paso 2 — PIN
  const { perfil, recordado } = paso;
  return (
    <View style={styles.contenedor}>
      {recordado ? (
        <>
          <Text style={styles.avatarGrande}>{emojiAvatar(perfil.avatar)}</Text>
          <Text style={styles.titulo} accessibilityRole="header">¡Hola, {perfil.apodo}! Escribe tu PIN</Text>
        </>
      ) : (
        <Text style={styles.titulo} accessibilityRole="header">Ahora tu PIN</Text>
      )}
      <TecladoPin valor={pin} onCambiar={(v) => { setError(null); setPin(v); }} deshabilitado={cargando} />
      {cargando ? <Text style={styles.ayuda}>Entrando…</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      <Enlace titulo={recordado ? 'No soy yo' : 'Cambiar el código'}
        onPress={() => irA(recordado ? { tipo: 'elegir' } : { tipo: 'codigo' })} />
      {recordado ? (
        <Enlace titulo="Quitar mi perfil de este teléfono" onPress={async () => {
          await olvidarPerfil(perfil.codigo);
          const restantes = perfiles.filter((p) => p.codigo !== perfil.codigo);
          setPerfiles(restantes);
          irA(restantes.length ? { tipo: 'elegir' } : { tipo: 'codigo' });
        }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.cielo },
  titulo: { fontSize: sizes.titulo - 4, fontWeight: '800', color: colors.cordillera, textAlign: 'center', marginBottom: 8 },
  ayuda: { fontSize: 18, color: colors.textoSuave, textAlign: 'center', marginBottom: 8 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginVertical: 16 },
  perfil: {
    width: 140, minHeight: 140, borderRadius: sizes.radio, backgroundColor: colors.blanco,
    justifyContent: 'center', alignItems: 'center', padding: 8,
  },
  perfilAvatar: { fontSize: 64 },
  perfilNombre: { fontSize: 20, fontWeight: '800', color: colors.cordillera, marginTop: 4 },
  avatarGrande: { fontSize: 80, textAlign: 'center' },
  input: {
    backgroundColor: colors.blanco, borderRadius: sizes.radio, fontSize: 32, letterSpacing: 8,
    textAlign: 'center', paddingVertical: 14, marginVertical: 8, color: colors.texto,
  },
  error: { color: colors.error, fontSize: 18, textAlign: 'center', marginVertical: 8 },
});
