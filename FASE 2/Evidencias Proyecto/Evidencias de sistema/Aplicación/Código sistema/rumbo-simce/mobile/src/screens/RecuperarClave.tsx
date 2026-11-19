// CU07 — Recuperar contraseña en dos pasos: (1) pedir el código por correo, (2) escribirlo con la nueva clave.
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { api } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { CampoTexto } from '../components/CampoTexto';
import { Enlace } from '../components/Enlace';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { colors, sizes } from '../theme';
import { mensajeDeError, validarEmail, validarPassword } from '../validacion';

interface Props {
  emailInicial?: string;
  onListo: () => void;
  onVolver: () => void;
}

export function RecuperarClave({ emailInicial = '', onListo, onVolver }: Props) {
  const [paso, setPaso] = useState<'pedir' | 'restablecer'>('pedir');
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function pedirCodigo() {
    setIntentado(true);
    setError(null);
    if (validarEmail(email)) return;
    setCargando(true);
    try {
      const res = await api.recuperar(email.trim());
      setAviso(res.mensaje);
      setPaso('restablecer');
      setIntentado(false);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }

  const errores = {
    codigo: /^\d{6}$/.test(codigo) ? null : 'El código tiene 6 números',
    password: validarPassword(password),
    confirmacion: confirmacion === password ? null : 'Las contraseñas no coinciden',
  };

  async function restablecer() {
    setIntentado(true);
    setError(null);
    if (Object.values(errores).some(Boolean)) return;
    setCargando(true);
    try {
      await api.restablecer(email.trim(), codigo, password);
      onListo();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }

  if (paso === 'pedir') {
    return (
      <Pantalla>
        <Text style={styles.titulo}>Recuperar contraseña</Text>
        <Text style={styles.texto}>Escribe el correo de tu cuenta y te enviaremos un código de 6 números.</Text>
        <CampoTexto etiqueta="Correo" value={email} onChangeText={setEmail} keyboardType="email-address"
          autoCapitalize="none" autoComplete="email" error={intentado ? validarEmail(email) : null}
          onSubmitEditing={pedirCodigo} />
        {error ? <Mensaje tipo="error" texto={error} /> : null}
        <BotonGrande titulo={cargando ? 'Enviando…' : 'Enviar código'} onPress={pedirCodigo} deshabilitado={cargando} />
        <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
      </Pantalla>
    );
  }

  const mostrar = (c: keyof typeof errores) => (intentado ? errores[c] : null);
  return (
    <Pantalla>
      <Text style={styles.titulo}>Nueva contraseña</Text>
      {aviso ? <Mensaje tipo="info" texto={`${aviso} Revisa también la carpeta de spam.`} /> : null}
      <CampoTexto etiqueta="Código recibido" value={codigo} onChangeText={(t) => setCodigo(t.replace(/\D/g, ''))}
        maxLength={6} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode"
        style={styles.codigo} error={mostrar('codigo')} />
      <CampoTexto etiqueta="Nueva contraseña (mínimo 8 caracteres)" value={password} onChangeText={setPassword}
        secureTextEntry autoComplete="new-password" error={mostrar('password')} />
      <CampoTexto etiqueta="Repite la nueva contraseña" value={confirmacion} onChangeText={setConfirmacion}
        secureTextEntry autoComplete="new-password" error={mostrar('confirmacion')} />
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <BotonGrande titulo={cargando ? 'Guardando…' : 'Cambiar contraseña'} onPress={restablecer} deshabilitado={cargando} />
      <Enlace titulo="No me llegó el código" onPress={() => { setPaso('pedir'); setCodigo(''); setError(null); }} />
      <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera, marginBottom: 8 },
  texto: { fontSize: 18, color: colors.textoSuave, marginBottom: 8 },
  codigo: { fontSize: 28, letterSpacing: 8, textAlign: 'center' },
});
