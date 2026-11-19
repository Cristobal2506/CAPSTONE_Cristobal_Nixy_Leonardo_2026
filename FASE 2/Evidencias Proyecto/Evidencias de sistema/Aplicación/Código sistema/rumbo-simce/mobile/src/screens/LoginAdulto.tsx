// CU01 — login de apoderado / docente.
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { api, Usuario } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { CampoTexto } from '../components/CampoTexto';
import { Enlace } from '../components/Enlace';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { colors, sizes } from '../theme';
import { mensajeDeError } from '../validacion';

interface Props {
  onEntrar: (token: string, usuario: Usuario) => void;
  onRegistrarse: () => void;
  onOlvideClave: (email: string) => void;
  onVolver: () => void;
  /** Mensaje a mostrar al llegar (ej: después de restablecer la contraseña). */
  aviso?: string;
}

export function LoginAdulto({ onEntrar, onRegistrarse, onOlvideClave, onVolver, aviso }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setError(null);
    setCargando(true);
    try {
      const res = await api.loginAdulto(email.trim(), password);
      onEntrar(res.token, res.usuario);
    } catch (e) {
      setError(mensajeDeError(e)); // 401 genérico o 423 con el tiempo de espera (HU-04)
      setPassword('');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Pantalla>
      <Text style={styles.titulo}>Ingreso de adultos</Text>
      {aviso && !error ? <Mensaje tipo="exito" texto={aviso} /> : null}
      <CampoTexto etiqueta="Correo" value={email} onChangeText={setEmail} placeholder="nombre@correo.cl"
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <CampoTexto etiqueta="Contraseña" value={password} onChangeText={setPassword}
        secureTextEntry autoComplete="current-password" textContentType="password"
        onSubmitEditing={() => email && password && entrar()} />
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <BotonGrande titulo={cargando ? 'Ingresando…' : 'Ingresar'} onPress={entrar}
        deshabilitado={cargando || !email || !password} />
      <Enlace titulo="¿Olvidaste tu contraseña?" onPress={() => onOlvideClave(email.trim())} />
      <Enlace titulo="¿No tienes cuenta? Regístrate" onPress={onRegistrarse} />
      <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera, marginBottom: 12 },
});
