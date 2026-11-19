// CU02 — Registrar cuenta de apoderado o docente.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, Usuario } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { CampoTexto } from '../components/CampoTexto';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { colors, sizes } from '../theme';
import { mensajeDeError, validarEmail, validarNombre, validarPassword } from '../validacion';

type RolRegistro = 'apoderado' | 'docente';

interface Props {
  onRegistrado: (token: string, usuario: Usuario) => void;
  onVolver: () => void;
}

export function Registro({ onRegistrado, onVolver }: Props) {
  const [rol, setRol] = useState<RolRegistro>('apoderado');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const errores = {
    nombre: validarNombre(nombre),
    email: validarEmail(email) ?? errorEmail,
    password: validarPassword(password),
    confirmacion: confirmacion === password ? null : 'Las contraseñas no coinciden',
  };
  const valido = !Object.values(errores).some(Boolean);

  async function registrar() {
    setIntentado(true);
    setError(null);
    if (!valido) return;
    setCargando(true);
    try {
      const res = await api.registro({ nombre: nombre.trim(), email: email.trim(), password, rol });
      onRegistrado(res.token, res.usuario);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_EN_USO') setErrorEmail('Ya existe una cuenta con este correo');
      else setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }

  const mostrar = (campo: keyof typeof errores) => (intentado ? errores[campo] : null);

  return (
    <Pantalla>
      <Text style={styles.titulo}>Crear cuenta</Text>
      <Text style={styles.etiqueta}>Soy…</Text>
      <View style={styles.roles} accessibilityRole="radiogroup">
        {(['apoderado', 'docente'] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRol(r)}
            accessibilityRole="radio"
            accessibilityState={{ checked: rol === r }}
            style={[styles.rol, rol === r && styles.rolActivo]}
          >
            <Text style={[styles.rolTexto, rol === r && styles.rolTextoActivo]}>
              {rol === r ? '● ' : '○ '}{r === 'apoderado' ? 'Apoderado/a' : 'Docente'}
            </Text>
          </Pressable>
        ))}
      </View>
      <CampoTexto etiqueta="Nombre" value={nombre} onChangeText={setNombre} autoComplete="name"
        textContentType="name" error={mostrar('nombre')} />
      <CampoTexto etiqueta="Correo" value={email} onChangeText={(t) => { setEmail(t); setErrorEmail(null); }}
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress"
        error={mostrar('email') ?? errorEmail} />
      <CampoTexto etiqueta="Contraseña (mínimo 8 caracteres)" value={password} onChangeText={setPassword}
        secureTextEntry autoComplete="new-password" textContentType="newPassword" error={mostrar('password')} />
      <CampoTexto etiqueta="Repite la contraseña" value={confirmacion} onChangeText={setConfirmacion}
        secureTextEntry autoComplete="new-password" error={mostrar('confirmacion')} />
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <BotonGrande titulo={cargando ? 'Creando cuenta…' : 'Crear cuenta'} onPress={registrar} deshabilitado={cargando} />
      <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera, marginBottom: 12 },
  etiqueta: { fontSize: 16, fontWeight: '600', color: colors.cordillera, marginBottom: 4 },
  roles: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  rol: {
    flex: 1, minHeight: 52, borderRadius: 12, borderWidth: 2, borderColor: colors.cordillera,
    backgroundColor: colors.blanco, justifyContent: 'center', alignItems: 'center',
  },
  rolActivo: { backgroundColor: colors.cordillera },
  rolTexto: { fontSize: 17, fontWeight: '700', color: colors.cordillera },
  rolTextoActivo: { color: colors.blanco },
});
