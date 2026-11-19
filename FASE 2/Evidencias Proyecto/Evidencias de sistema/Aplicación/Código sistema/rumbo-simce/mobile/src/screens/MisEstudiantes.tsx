// CU04 — Crear perfil de estudiante y vincularlo al apoderado (requiere consentimiento, CU03).
// CU06 — Inscribir al estudiante en un curso con el código que entrega el docente.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, EstudianteDeApoderado } from '../api';
import { AVATARES, emojiAvatar } from '../avatares';
import { BotonGrande } from '../components/BotonGrande';
import { CampoTexto } from '../components/CampoTexto';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { Tarjeta } from '../components/Tarjeta';
import { colors, sizes } from '../theme';
import { recordarPerfil } from '../perfilesDispositivo';
import { mensajeDeError } from '../validacion';

interface Props {
  onIrAConsentimiento: () => void;
  onVolver: () => void;
}

export function MisEstudiantes({ onIrAConsentimiento, onVolver }: Props) {
  const [estudiantes, setEstudiantes] = useState<EstudianteDeApoderado[] | null>(null);
  const [tieneConsentimiento, setTieneConsentimiento] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [recienCreado, setRecienCreado] = useState<{ apodo: string; codigo: string } | null>(null);

  const cargar = useCallback(async () => {
    setErrorCarga(null);
    try {
      const [lista, c] = await Promise.all([api.misEstudiantes(), api.consentimiento()]);
      setEstudiantes(lista.estudiantes);
      setTieneConsentimiento(Boolean(c.consentimiento));
    } catch (e) {
      setErrorCarga(mensajeDeError(e));
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  if (!estudiantes) {
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
      <Text style={styles.titulo} accessibilityRole="header">Mis estudiantes</Text>

      {!tieneConsentimiento ? (
        <Tarjeta titulo="Falta tu permiso">
          <Text style={styles.texto}>
            Para crear el perfil de tu hijo o hija primero debes leer y aceptar cómo usamos sus datos.
          </Text>
          <BotonGrande titulo="Revisar y aceptar" onPress={onIrAConsentimiento} />
        </Tarjeta>
      ) : null}

      {recienCreado ? (
        <View style={styles.codigoNuevo} accessibilityRole="alert">
          <Text style={styles.texto}>Perfil creado ✔. Para entrar, {recienCreado.apodo} necesita este código:</Text>
          <Text style={styles.codigoGrande} selectable accessibilityLabel={`Código ${recienCreado.codigo.split('').join(' ')}`}>
            {recienCreado.codigo}
          </Text>
          <Text style={styles.textoSuave}>…y el PIN de 4 números que elegiste. Anótalos en un lugar seguro.</Text>
        </View>
      ) : null}

      {estudiantes.length === 0 && tieneConsentimiento && !creando ? (
        <Mensaje tipo="info" texto="Aún no tienes estudiantes. Crea el perfil de tu hijo o hija para que pueda jugar." />
      ) : null}

      {estudiantes.map((e) => (
        <TarjetaEstudiante key={e.id} estudiante={e} onInscrito={cargar} />
      ))}

      {tieneConsentimiento && !creando ? (
        <BotonGrande titulo="Agregar estudiante" onPress={() => { setCreando(true); setRecienCreado(null); }} />
      ) : null}

      {creando ? (
        <FormularioEstudiante
          onCancelar={() => setCreando(false)}
          onCreado={(apodo, codigo) => {
            setCreando(false);
            setRecienCreado({ apodo, codigo });
            void cargar();
          }}
          onSinConsentimiento={() => { setCreando(false); setTieneConsentimiento(false); }}
        />
      ) : null}

      <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
    </Pantalla>
  );
}

// ───────── CU04 — formulario de perfil ─────────
function FormularioEstudiante({ onCreado, onCancelar, onSinConsentimiento }: {
  onCreado: (apodo: string, codigo: string) => void;
  onCancelar: () => void;
  onSinConsentimiento: () => void;
}) {
  const [apodo, setApodo] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARES[0].clave);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const errores = {
    apodo: apodo.trim().length >= 2 ? null : 'Escribe un apodo o nombre de pila (mínimo 2 letras)',
    pin: /^\d{4}$/.test(pin) ? null : 'El PIN son 4 números',
    pin2: pin2 === pin ? null : 'Los PIN no coinciden',
  };
  const mostrar = (c: keyof typeof errores) => (intentado ? errores[c] : null);

  async function crear() {
    setIntentado(true);
    setError(null);
    if (Object.values(errores).some(Boolean)) return;
    setGuardando(true);
    try {
      const res = await api.crearEstudiante({ apodo: apodo.trim(), avatar, pin });
      onCreado(res.estudiante.apodo, res.estudiante.codigo_acceso);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SIN_CONSENTIMIENTO') onSinConsentimiento();
      else setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta titulo="Nuevo estudiante">
      <Text style={styles.textoSuave}>Por privacidad solo pedimos un apodo: nada de RUT, apellidos ni correo.</Text>
      <CampoTexto etiqueta="Apodo o nombre de pila" value={apodo} onChangeText={setApodo} maxLength={40}
        autoCapitalize="words" error={mostrar('apodo')} />

      <Text style={styles.etiqueta}>Avatar</Text>
      <View style={styles.avatares} accessibilityRole="radiogroup">
        {AVATARES.map((a) => (
          <Pressable
            key={a.clave}
            onPress={() => setAvatar(a.clave)}
            accessibilityRole="radio"
            accessibilityLabel={a.nombre}
            accessibilityState={{ checked: avatar === a.clave }}
            style={[styles.avatar, avatar === a.clave && styles.avatarActivo]}
          >
            <Text style={styles.avatarEmoji}>{a.emoji}</Text>
          </Pressable>
        ))}
      </View>

      <CampoTexto etiqueta="PIN de 4 números (lo usará para entrar)" value={pin}
        onChangeText={(t) => setPin(t.replace(/\D/g, ''))} maxLength={4} keyboardType="number-pad" secureTextEntry
        error={mostrar('pin')} />
      <CampoTexto etiqueta="Repite el PIN" value={pin2} onChangeText={(t) => setPin2(t.replace(/\D/g, ''))}
        maxLength={4} keyboardType="number-pad" secureTextEntry error={mostrar('pin2')} />
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <BotonGrande titulo={guardando ? 'Creando…' : 'Crear perfil'} onPress={crear} deshabilitado={guardando} />
      <BotonGrande titulo="Cancelar" onPress={onCancelar} color={colors.blanco} />
    </Tarjeta>
  );
}

// ───────── Tarjeta de un estudiante + CU06 inscribir en curso ─────────
function TarjetaEstudiante({ estudiante: e, onInscrito }: { estudiante: EstudianteDeApoderado; onInscrito: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [estado, setEstado] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function inscribir() {
    setEstado(null);
    if (codigo.trim().length !== 6) return setEstado({ tipo: 'error', texto: 'El código del curso tiene 6 caracteres' });
    setGuardando(true);
    try {
      const res = await api.inscribirEnCurso(e.id, codigo.trim());
      setEstado({ tipo: 'exito', texto: `Listo: ${e.apodo} ya está en ${res.curso.nombre}` });
      setAbierto(false);
      setCodigo('');
      onInscrito();
    } catch (err) {
      setEstado({ tipo: 'error', texto: mensajeDeError(err) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta>
      <View style={styles.filaEstudiante}>
        <Text style={styles.avatarGrande}>{emojiAvatar(e.avatar)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.apodo}>{e.apodo}</Text>
          <Text style={styles.texto}>Código para entrar: <Text style={styles.codigo} selectable>{e.codigo_acceso}</Text></Text>
          <Text style={styles.textoSuave}>{e.curso ? `Curso: ${e.curso}` : 'Sin curso'}</Text>
        </View>
      </View>
      {estado ? <Mensaje tipo={estado.tipo} texto={estado.texto} /> : null}
      {/* HU-03: deja el perfil listo en este teléfono; el niño entra tocando su avatar + PIN */}
      <BotonGrande titulo="Preparar este teléfono para jugar" color={colors.blanco} onPress={async () => {
        await recordarPerfil({ codigo: e.codigo_acceso, apodo: e.apodo, avatar: e.avatar });
        setEstado({ tipo: 'exito', texto: `Listo: en este teléfono, ${e.apodo} entra tocando su avatar y escribiendo su PIN.` });
      }} />
      {abierto ? (
        <>
          <CampoTexto etiqueta="Código del curso (te lo entrega el docente)" value={codigo}
            onChangeText={(t) => setCodigo(t.toUpperCase())} maxLength={6} autoCapitalize="characters" autoCorrect={false}
            style={styles.campoCodigo} onSubmitEditing={inscribir} />
          <BotonGrande titulo={guardando ? 'Inscribiendo…' : 'Inscribir'} onPress={inscribir} deshabilitado={guardando} />
          <BotonGrande titulo="Cancelar" onPress={() => { setAbierto(false); setEstado(null); }} color={colors.blanco} />
        </>
      ) : (
        <BotonGrande titulo={e.curso ? 'Cambiar de curso' : 'Inscribir en un curso'} onPress={() => setAbierto(true)}
          color={colors.blanco} />
      )}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera, marginBottom: 12 },
  texto: { fontSize: 17, color: colors.texto, lineHeight: 24 },
  textoSuave: { fontSize: 15, color: colors.textoSuave, marginVertical: 4 },
  etiqueta: { fontSize: 16, fontWeight: '600', color: colors.cordillera, marginTop: 8, marginBottom: 4 },
  avatares: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blanco, justifyContent: 'center',
    alignItems: 'center', borderWidth: 3, borderColor: 'transparent',
  },
  avatarActivo: { borderColor: colors.cordillera },
  avatarEmoji: { fontSize: 30 },
  codigoNuevo: { backgroundColor: '#E6F4EA', borderRadius: sizes.radio, padding: 16, marginBottom: 16, borderLeftWidth: 6, borderLeftColor: colors.pasto },
  codigoGrande: { fontSize: 40, fontWeight: '800', letterSpacing: 8, color: colors.cordillera, textAlign: 'center', marginVertical: 8 },
  filaEstudiante: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarGrande: { fontSize: 44 },
  apodo: { fontSize: 22, fontWeight: '800', color: colors.cordillera },
  codigo: { fontWeight: '800', letterSpacing: 2, color: colors.cordillera },
  campoCodigo: { fontSize: 24, letterSpacing: 6, textAlign: 'center' },
});
