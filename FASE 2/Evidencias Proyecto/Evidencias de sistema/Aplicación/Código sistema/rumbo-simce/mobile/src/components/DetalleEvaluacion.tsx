// v15: detalle de una prueba entregada para el docente del curso.
// Muestra el logro por unidad (o por OA en una prueba de unidad), una unidad sugerida
// para el diagnóstico y cada pregunta con la respuesta del alumno y la correcta.
// La sugerencia es solo un apoyo: la decisión la toma el profesor.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, DetalleEvaluacion as Detalle } from '../api';
import { colors } from '../theme';
import { mensajeDeError } from '../validacion';
import { Mensaje } from './Mensaje';
import { MiniaturaTrazos, Trazo } from './Trazos';

type Filtro = 'incorrectas' | 'correctas' | 'todas';

function Enunciado({ texto }: { texto: string }) {
  const partes = texto.split(/(\[\[[0-9]\]\])/g);
  return (
    <Text style={styles.enunciado}>
      {partes.map((p, i) => /^\[\[[0-9]\]\]$/.test(p)
        ? <Text key={i} style={styles.digito}>{p.slice(2, -2)}</Text>
        : <Text key={i}>{p}</Text>)}
    </Text>
  );
}

function colorLogro(pct: number) {
  return pct >= 75 ? colors.pasto : pct >= 50 ? colors.sol : colors.error;
}

function Barra({ etiqueta, correctas, total, porcentaje, destacada }:
  { etiqueta: string; correctas: number; total: number; porcentaje: number; destacada?: boolean }) {
  return (
    <View style={[styles.fila, destacada && styles.filaDestacada]}
      accessibilityLabel={`${etiqueta}: ${correctas} de ${total} correctas, ${porcentaje} por ciento`}>
      <View style={styles.filaTexto}>
        <Text style={styles.filaEtiqueta} numberOfLines={2}>{etiqueta}</Text>
        <Text style={styles.filaValor}>{correctas}/{total} · {porcentaje}%</Text>
      </View>
      <View style={styles.pista}>
        <View style={[styles.relleno, { width: `${Math.max(porcentaje, 2)}%`, backgroundColor: colorLogro(porcentaje) }]} />
      </View>
    </View>
  );
}

export function DetalleEvaluacion({ intentoId, onSugerencia }:
  { intentoId: number; onSugerencia?: (unidad: number) => void }) {
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('incorrectas');

  useEffect(() => {
    let vivo = true;
    api.detalleEvaluacion(intentoId)
      .then((d) => {
        if (!vivo) return;
        setDetalle(d);
        if (d.unidadSugerida && onSugerencia) onSugerencia(d.unidadSugerida);
      })
      .catch((e) => vivo && setError(mensajeDeError(e)));
    return () => { vivo = false; };
    // onSugerencia se aplica una sola vez al cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentoId]);

  if (error) return <Mensaje tipo="error" texto={error} />;
  if (!detalle) return <ActivityIndicator color={colors.cordillera} style={{ marginVertical: 8 }} />;

  const diagnostico = detalle.intento.tipo === 'diagnostico';
  const usarUnidades = detalle.porUnidad.length > 1;
  const malas = detalle.preguntas.filter((q) => !q.esCorrecta).length;
  const visibles = detalle.preguntas.filter((q) =>
    filtro === 'todas' ? true : filtro === 'incorrectas' ? !q.esCorrecta : q.esCorrecta);

  return (
    <View style={styles.caja}>
      <Text style={styles.subtitulo}>{usarUnidades ? 'Resultado por unidad' : 'Resultado por objetivo de aprendizaje'}</Text>
      {usarUnidades
        ? detalle.porUnidad.map((u) => (
          <Barra key={u.unidad} etiqueta={u.nombre} correctas={u.correctas} total={u.total} porcentaje={u.porcentaje}
            destacada={diagnostico && u.unidad === detalle.unidadSugerida} />))
        : detalle.porOA.map((o) => (
          <Barra key={o.oa} etiqueta={`${o.oa} · ${o.descripcion ?? ''}`} correctas={o.correctas} total={o.total} porcentaje={o.porcentaje} />))}

      {diagnostico && detalle.unidadSugerida ? (
        <Mensaje tipo="info" texto={`Sugerencia: comenzar en la Unidad ${detalle.unidadSugerida}, la primera con menos de ${detalle.umbralSugerencia} % de logro. Ya quedó marcada abajo; puedes cambiarla.`} />
      ) : null}

      <Pressable onPress={() => setAbierto((v) => !v)} accessibilityRole="button" style={styles.toggle}>
        <Text style={styles.toggleTexto}>
          {abierto ? '▲ Ocultar preguntas' : `▼ Ver pregunta por pregunta (${malas} incorrectas de ${detalle.preguntas.length})`}
        </Text>
      </Pressable>

      {abierto ? (
        <>
          <View style={styles.filtros}>
            {(['incorrectas', 'correctas', 'todas'] as Filtro[]).map((f) => (
              <Pressable key={f} onPress={() => setFiltro(f)} accessibilityRole="button"
                accessibilityState={{ selected: filtro === f }} style={[styles.chip, filtro === f && styles.chipActivo]}>
                <Text style={[styles.chipTexto, filtro === f && styles.chipTextoActivo]}>
                  {f === 'incorrectas' ? `✖ Incorrectas (${malas})` : f === 'correctas' ? `✔ Correctas (${detalle.preguntas.length - malas})` : 'Todas'}
                </Text>
              </Pressable>
            ))}
          </View>
          {visibles.length === 0 ? <Text style={styles.vacio}>No hay preguntas en este filtro.</Text> : null}
          {visibles.map((q) => (
            <View key={q.orden} style={[styles.pregunta, q.esCorrecta ? styles.bien : styles.mal]}>
              <Text style={styles.preguntaMeta}>
                {q.esCorrecta ? '✔' : '✖'} Pregunta {q.orden}{q.oa ? ` · ${q.oa}` : ''}{q.unidad ? ` · Unidad ${q.unidad}` : ''}
              </Text>
              <Enunciado texto={q.enunciado} />
              <Text style={styles.respuesta}>
                {q.escritura ? 'Escribió' : 'Respondió'}: {q.elegida ? `${q.elegida.clave ? `${q.elegida.clave}. ` : ''}${q.elegida.texto}` : 'sin responder'}
              </Text>
              {q.escritura ? (
                <View style={styles.escritura}>
                  {/* v16: la escritura original permite detectar un error de lectura del sistema */}
                  <MiniaturaTrazos trazos={(q.escritura.trazos as Trazo[][]).flatMap((parte, k) =>
                    // fracción: numerador arriba y denominador abajo
                    k === 0 ? parte : parte.map((t) => t.map(([x, y]) => [x, y + 160] as [number, number])))} />
                  {q.escritura.corregidaPorAlumno ? (
                    <Text style={styles.nota}>El sistema leyó «{q.escritura.reconocido}» y el alumno lo corrigió.</Text>
                  ) : q.escritura.confianza != null && q.escritura.confianza < 0.7 ? (
                    <Text style={styles.nota}>Lectura poco segura ({Math.round(q.escritura.confianza * 100)} %): revisa la escritura.</Text>
                  ) : null}
                </View>
              ) : null}
              {!q.esCorrecta && q.correcta ? (
                <Text style={styles.correcta}>Correcta: {q.correcta.clave ? `${q.correcta.clave}. ` : ''}{q.correcta.texto}</Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { marginTop: 10 },
  subtitulo: { fontSize: 16, fontWeight: '800', color: colors.cordillera, marginBottom: 6 },
  fila: { marginBottom: 8, padding: 6, borderRadius: 10 },
  filaDestacada: { backgroundColor: '#FFF3CF', borderWidth: 1, borderColor: colors.sol },
  filaTexto: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  filaEtiqueta: { flex: 1, fontSize: 14, color: colors.texto },
  filaValor: { fontSize: 14, fontWeight: '800', color: colors.texto },
  pista: { height: 10, borderRadius: 5, backgroundColor: '#E4EAF0', overflow: 'hidden' },
  relleno: { height: 10, borderRadius: 5 },
  toggle: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#AABBCD', marginVertical: 8, minHeight: 48, justifyContent: 'center' },
  toggleTexto: { fontSize: 15, fontWeight: '800', color: colors.cordillera },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: '#AABBCD', backgroundColor: colors.blanco, minHeight: 40, justifyContent: 'center' },
  chipActivo: { backgroundColor: colors.cordillera, borderColor: colors.cordillera },
  chipTexto: { fontSize: 14, color: colors.cordillera, fontWeight: '700' },
  chipTextoActivo: { color: colors.blanco },
  vacio: { fontSize: 14, color: colors.textoSuave, marginVertical: 6 },
  pregunta: { borderRadius: 12, padding: 10, marginVertical: 4, borderLeftWidth: 5, backgroundColor: '#F7F9FB' },
  bien: { borderLeftColor: colors.pasto },
  mal: { borderLeftColor: colors.error },
  preguntaMeta: { fontSize: 13, fontWeight: '800', color: colors.textoSuave, marginBottom: 4 },
  enunciado: { fontSize: 15, color: colors.texto, lineHeight: 21 },
  digito: { color: '#B24700', backgroundColor: '#FFE0A6', fontWeight: '900', textDecorationLine: 'underline' },
  respuesta: { fontSize: 14, color: colors.texto, marginTop: 6 },
  correcta: { fontSize: 14, color: colors.pasto, fontWeight: '800', marginTop: 2 },
  escritura: { marginTop: 6, gap: 4 },
  nota: { fontSize: 13, color: '#B24700', fontWeight: '700' },
});
