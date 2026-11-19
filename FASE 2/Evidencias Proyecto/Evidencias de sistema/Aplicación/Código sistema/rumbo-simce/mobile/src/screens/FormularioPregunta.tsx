// CU08 — Crear o editar una pregunta del banco (administrador).
// Aplica las mismas reglas que la API para avisar antes de enviar:
//   3 o 4 opciones · una correcta · cada opción incorrecta con el error típico que la explica (HU-16).
// Editar el contenido deja la pregunta pendiente de revisión pedagógica (lo decide la API).
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, PreguntaBanco, PreguntaEntrada, TipoError } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { CampoTexto } from '../components/CampoTexto';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { Tarjeta } from '../components/Tarjeta';
import { colors, sizes } from '../theme';
import { mensajeDeError } from '../validacion';

interface Props {
  eje: { id: number; codigo: string; nombre: string };
  /** Pregunta a editar; sin ella se crea una nueva. */
  pregunta?: PreguntaBanco;
  onGuardada: (p: PreguntaBanco) => void;
  onCancelar: () => void;
}

const CLAVES = ['A', 'B', 'C', 'D'] as const;
const ESTRATEGIAS = [
  { valor: 'numerica', nombre: 'Numérica' },
  { valor: 'visual', nombre: 'Visual' },
  { valor: 'concreta', nombre: 'Concreta' },
  { valor: 'verbal', nombre: 'Verbal' },
];

interface OpcionForm { texto: string; tipoError: string | null }

export function FormularioPregunta({ eje, pregunta, onGuardada, onCancelar }: Props) {
  const [tipos, setTipos] = useState<TipoError[] | null>(null);
  const [codigo, setCodigo] = useState(pregunta?.codigo ?? '');
  const [enunciado, setEnunciado] = useState(pregunta?.enunciado ?? '');
  const [opciones, setOpciones] = useState<OpcionForm[]>(
    CLAVES.map((c) => {
      const o = pregunta?.opciones.find((x) => x.clave === c);
      return { texto: o?.texto ?? '', tipoError: o?.tipoError ?? null };
    }),
  );
  const [correcta, setCorrecta] = useState(pregunta?.respuestaCorrecta ?? 'A');
  const [dificultad, setDificultad] = useState(pregunta?.dificultad ?? 1);
  const [estrategia, setEstrategia] = useState(pregunta?.estrategia ?? 'numerica');
  const [explicacion, setExplicacion] = useState(pregunta?.explicacion ?? '');
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.tiposError()
      // Sirven los errores del eje y los transversales (sin eje).
      .then((r) => setTipos(r.tiposError.filter((t) => t.eje === null || t.eje === eje.codigo)))
      .catch((e) => setError(mensajeDeError(e)));
  }, [eje.codigo]);

  // La opción D es opcional: si queda vacía la pregunta tiene 3 opciones.
  const usadas = CLAVES.filter((c, i) => i < 3 || opciones[i].texto.trim());
  const cambiarOpcion = (i: number, cambio: Partial<OpcionForm>) =>
    setOpciones((ops) => ops.map((o, j) => (j === i ? { ...o, ...cambio } : o)));

  const errores = {
    enunciado: enunciado.trim().length >= 5 ? null : 'Escribe el enunciado (mínimo 5 caracteres)',
    opciones: usadas.some((c) => !opciones[CLAVES.indexOf(c)].texto.trim()) ? 'Las opciones A, B y C son obligatorias' : null,
    correcta: usadas.includes(correcta as (typeof CLAVES)[number]) ? null : 'La respuesta correcta debe ser una de las opciones',
    tipos: usadas.some((c) => c !== correcta && !opciones[CLAVES.indexOf(c)].tipoError)
      ? 'Cada opción incorrecta necesita su tipo de error' : null,
    repetidas: new Set(usadas.map((c) => opciones[CLAVES.indexOf(c)].texto.trim().toLowerCase())).size !== usadas.length
      ? 'Hay opciones con el mismo texto' : null,
    explicacion: explicacion.trim().length >= 5 ? null : 'Escribe la explicación que verá el estudiante',
  };
  const primerError = Object.values(errores).find(Boolean) ?? null;

  async function guardar() {
    setIntentado(true);
    setError(null);
    if (primerError) return;
    const datos: PreguntaEntrada = {
      ejeId: eje.id,
      ...(codigo.trim() ? { codigo: codigo.trim() } : {}),
      enunciado: enunciado.trim(),
      opciones: usadas.map((c) => {
        const o = opciones[CLAVES.indexOf(c)];
        return { clave: c, texto: o.texto.trim(), tipoError: c === correcta ? null : o.tipoError };
      }),
      respuestaCorrecta: correcta,
      dificultad,
      estrategia,
      explicacion: explicacion.trim(),
    };
    setGuardando(true);
    try {
      const res = pregunta ? await api.editarPregunta(pregunta.id, datos) : await api.crearPregunta(datos);
      onGuardada(res.pregunta);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  if (!tipos) {
    return (
      <Pantalla>
        {error ? <Mensaje tipo="error" texto={error} /> : <ActivityIndicator size="large" color={colors.cordillera} />}
        <BotonGrande titulo="Volver" onPress={onCancelar} color={colors.blanco} />
      </Pantalla>
    );
  }

  return (
    <Pantalla centrada={false}>
      <Text style={styles.titulo} accessibilityRole="header">{pregunta ? 'Editar pregunta' : 'Nueva pregunta'}</Text>
      <Text style={styles.subtitulo}>{eje.nombre}</Text>
      {pregunta?.revisadaPedagogicamente ? (
        <Mensaje tipo="info" texto="Si cambias el contenido, la pregunta vuelve a quedar pendiente de revisión pedagógica." />
      ) : null}

      <CampoTexto etiqueta="Código (opcional, ej: NUM-09)" value={codigo} onChangeText={setCodigo}
        autoCapitalize="characters" maxLength={20} />
      <CampoTexto etiqueta="Enunciado" value={enunciado} onChangeText={setEnunciado} multiline
        style={styles.multilinea} maxLength={600} error={intentado ? errores.enunciado : null} />

      {CLAVES.map((c, i) => {
        const o = opciones[i];
        const esCorrecta = correcta === c;
        const activa = i < 3 || o.texto.trim().length > 0;
        return (
          <Tarjeta key={c} titulo={`Opción ${c}${i === 3 ? ' (opcional)' : ''}`}>
            <CampoTexto etiqueta={`Texto de la opción ${c}`} value={o.texto} maxLength={200}
              onChangeText={(t) => cambiarOpcion(i, { texto: t })} />
            <Pressable
              onPress={() => activa && setCorrecta(c)}
              accessibilityRole="radio"
              accessibilityState={{ checked: esCorrecta, disabled: !activa }}
              style={[styles.chip, esCorrecta && styles.chipCorrecta, !activa && { opacity: 0.4 }]}
            >
              <Text style={[styles.chipTexto, esCorrecta && styles.chipTextoActivo]}>
                {esCorrecta ? '✔ Respuesta correcta' : 'Marcar como correcta'}
              </Text>
            </Pressable>
            {!esCorrecta && activa ? (
              <>
                <Text style={styles.etiqueta}>¿Qué error comete quien elige esta opción?</Text>
                <View style={styles.chips} accessibilityRole="radiogroup">
                  {tipos.map((t) => (
                    <Pressable
                      key={t.codigo}
                      onPress={() => cambiarOpcion(i, { tipoError: t.codigo })}
                      accessibilityRole="radio"
                      accessibilityLabel={t.descripcion}
                      accessibilityState={{ checked: o.tipoError === t.codigo }}
                      style={[styles.chip, o.tipoError === t.codigo && styles.chipActivo]}
                    >
                      <Text style={[styles.chipTexto, o.tipoError === t.codigo && styles.chipTextoActivo]}>{t.codigo}</Text>
                    </Pressable>
                  ))}
                </View>
                {o.tipoError ? (
                  <Text style={styles.ayuda}>{tipos.find((t) => t.codigo === o.tipoError)?.descripcion}</Text>
                ) : null}
              </>
            ) : null}
          </Tarjeta>
        );
      })}

      <Text style={styles.etiqueta}>Nivel de dificultad</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((d) => (
          <Pressable key={d} onPress={() => setDificultad(d)} accessibilityRole="radio"
            accessibilityState={{ checked: dificultad === d }}
            style={[styles.chip, styles.chipNumero, dificultad === d && styles.chipActivo]}>
            <Text style={[styles.chipTexto, dificultad === d && styles.chipTextoActivo]}>{d}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.etiqueta}>Estrategia de la explicación</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {ESTRATEGIAS.map((e) => (
          <Pressable key={e.valor} onPress={() => setEstrategia(e.valor)} accessibilityRole="radio"
            accessibilityState={{ checked: estrategia === e.valor }}
            style={[styles.chip, estrategia === e.valor && styles.chipActivo]}>
            <Text style={[styles.chipTexto, estrategia === e.valor && styles.chipTextoActivo]}>{e.nombre}</Text>
          </Pressable>
        ))}
      </View>

      <CampoTexto etiqueta="Explicación (la ve el estudiante después de responder)" value={explicacion}
        onChangeText={setExplicacion} multiline style={styles.multilinea} maxLength={1000}
        error={intentado ? errores.explicacion : null} />

      {intentado && primerError && primerError !== errores.enunciado && primerError !== errores.explicacion
        ? <Mensaje tipo="error" texto={primerError} /> : null}
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <BotonGrande titulo={guardando ? 'Guardando…' : pregunta ? 'Guardar cambios' : 'Crear pregunta'}
        onPress={guardar} deshabilitado={guardando} />
      <BotonGrande titulo="Cancelar" onPress={onCancelar} color={colors.blanco} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera },
  subtitulo: { fontSize: 18, color: colors.textoSuave, marginBottom: 8 },
  etiqueta: { fontSize: 16, fontWeight: '600', color: colors.cordillera, marginTop: 10, marginBottom: 6 },
  ayuda: { fontSize: 14, color: colors.textoSuave, marginTop: 4 },
  multilinea: { minHeight: 90, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 2, borderColor: colors.cordillera,
    backgroundColor: colors.blanco, justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  chipNumero: { minWidth: 52 },
  chipActivo: { backgroundColor: colors.cordillera },
  chipCorrecta: { backgroundColor: colors.pasto, borderColor: colors.pasto },
  chipTexto: { fontSize: 15, fontWeight: '700', color: colors.cordillera },
  chipTextoActivo: { color: colors.blanco },
});
