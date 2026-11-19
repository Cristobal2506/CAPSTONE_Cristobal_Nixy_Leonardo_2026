// CU05 — Crear curso (docente): el curso recibe un código de 6 caracteres que el docente
// comparte con los apoderados para que inscriban a sus hijos (CU06). Lista también los inscritos.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, Curso } from '../api';
import { emojiAvatar } from '../avatares';
import { BotonGrande } from '../components/BotonGrande';
import { CampoTexto } from '../components/CampoTexto';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { Tarjeta } from '../components/Tarjeta';
import { colors, sizes } from '../theme';
import { mensajeDeError } from '../validacion';

export function MisCursos({ onVolver }: { onVolver: () => void }) {
  const [cursos, setCursos] = useState<Curso[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState<Curso | null>(null);

  const cargar = useCallback(async () => {
    setErrorCarga(null);
    try {
      setCursos((await api.misCursos()).cursos);
    } catch (e) {
      setErrorCarga(mensajeDeError(e));
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  if (!cursos) {
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
      <Text style={styles.titulo} accessibilityRole="header">Mis cursos</Text>

      {nuevo ? (
        <View style={styles.codigoNuevo} accessibilityRole="alert">
          <Text style={styles.texto}>Curso «{nuevo.nombre}» creado ✔. Comparte este código con los apoderados:</Text>
          <Text style={styles.codigoGrande} selectable accessibilityLabel={`Código ${nuevo.codigo_union.split('').join(' ')}`}>
            {nuevo.codigo_union}
          </Text>
          <Text style={styles.textoSuave}>Con él inscriben a sus hijos desde su cuenta.</Text>
        </View>
      ) : null}

      {cursos.length === 0 && !creando ? (
        <Mensaje tipo="info" texto="Aún no tienes cursos. Crea uno para obtener el código que compartirás con los apoderados." />
      ) : null}

      {cursos.map((c) => <TarjetaCurso key={c.id} curso={c} />)}

      {creando ? (
        <FormularioCurso
          onCancelar={() => setCreando(false)}
          onCreado={(c) => { setCreando(false); setNuevo(c); void cargar(); }}
        />
      ) : (
        <BotonGrande titulo="Crear curso" onPress={() => { setCreando(true); setNuevo(null); }} />
      )}

      <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
    </Pantalla>
  );
}

function FormularioCurso({ onCreado, onCancelar }: { onCreado: (c: Curso) => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState('');
  const [establecimiento, setEstablecimiento] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const errorNombre = nombre.trim().length >= 2 ? null : 'Escribe el nombre del curso, por ejemplo «4° Básico A»';

  async function crear() {
    setIntentado(true);
    setError(null);
    if (errorNombre) return;
    setGuardando(true);
    try {
      const res = await api.crearCurso({
        nombre: nombre.trim(),
        ...(establecimiento.trim() ? { establecimiento: establecimiento.trim() } : {}),
      });
      onCreado(res.curso);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta titulo="Nuevo curso">
      <CampoTexto etiqueta="Nombre del curso" value={nombre} onChangeText={setNombre} placeholder="4° Básico A"
        maxLength={80} error={intentado ? errorNombre : null} />
      <CampoTexto etiqueta="Establecimiento (opcional)" value={establecimiento} onChangeText={setEstablecimiento}
        maxLength={120} />
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <BotonGrande titulo={guardando ? 'Creando…' : 'Crear curso'} onPress={crear} deshabilitado={guardando} />
      <BotonGrande titulo="Cancelar" onPress={onCancelar} color={colors.blanco} />
    </Tarjeta>
  );
}

function TarjetaCurso({ curso: c }: { curso: Curso }) {
  const [alumnos, setAlumnos] = useState<{ id: number; apodo: string; avatar: string }[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alternar() {
    if (abierto) return setAbierto(false);
    setAbierto(true);
    setError(null);
    try {
      setAlumnos((await api.estudiantesDeCurso(c.id)).estudiantes);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <Tarjeta>
      <Text style={styles.nombreCurso}>{c.nombre}</Text>
      {c.establecimiento ? <Text style={styles.textoSuave}>{c.establecimiento} · {c.anio}</Text> : null}
      <Text style={styles.texto}>Código del curso: <Text style={styles.codigo} selectable>{c.codigo_union}</Text></Text>
      <Text style={styles.textoSuave}>{c.estudiantes ?? 0} estudiante{c.estudiantes === 1 ? '' : 's'} inscrito{c.estudiantes === 1 ? '' : 's'}</Text>
      <BotonGrande titulo={abierto ? 'Ocultar estudiantes' : 'Ver estudiantes'} onPress={alternar} color={colors.blanco} />
      {abierto ? (
        error ? <Mensaje tipo="error" texto={error} />
          : !alumnos ? <ActivityIndicator color={colors.cordillera} />
            : alumnos.length === 0 ? <Text style={styles.textoSuave}>Todavía no hay estudiantes inscritos.</Text>
              : alumnos.map((a) => (
                <Text key={a.id} style={styles.alumno}>{emojiAvatar(a.avatar)}  {a.apodo}</Text>
              ))
      ) : null}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera, marginBottom: 12 },
  texto: { fontSize: 17, color: colors.texto, lineHeight: 24 },
  textoSuave: { fontSize: 15, color: colors.textoSuave, marginVertical: 4 },
  codigoNuevo: { backgroundColor: '#E6F4EA', borderRadius: sizes.radio, padding: 16, marginBottom: 16, borderLeftWidth: 6, borderLeftColor: colors.pasto },
  codigoGrande: { fontSize: 40, fontWeight: '800', letterSpacing: 8, color: colors.cordillera, textAlign: 'center', marginVertical: 8 },
  nombreCurso: { fontSize: 22, fontWeight: '800', color: colors.cordillera },
  codigo: { fontWeight: '800', letterSpacing: 2, color: colors.cordillera },
  alumno: { fontSize: 18, color: colors.texto, paddingVertical: 6 },
});
