// CU09 / CU12 / CU11 / CU13 — La tanda diaria Kumon.
//   1. Hoja por hoja: primero el ejemplo resuelto (nadie explica antes), luego los ejercicios.
//      Mientras responde no se le dice si acertó: como en la hoja de papel.
//   2. «Revisar»: se marcan con ✖ los incorrectos, sin mostrar la respuesta correcta.
//   3. Corrige solo esos y vuelve a revisar, hasta dejar todo correcto.
//   4. Resultado: acierto de la primera vuelta, tiempo frente al estándar y la decisión (avanzar / repetir / retroceder).
// v16.3: los ejercicios con respuesta numérica se responden escribiendo con el dedo o el lápiz
//   (escribir → el sistema lee → el alumno confirma). Los demás siguen con alternativas.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, Decision, ResultadoTanda, Tanda as TandaApi } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { Mensaje } from '../components/Mensaje';
import { RespuestaEscrita, RespuestaConfirmada } from '../components/RespuestaEscrita';
import { mmss } from '../tiempo';
import { colors, sizes } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props { onVolver: () => void; conjuntoId?:number }

type Fase =
  | { tipo: 'cargando' }
  | { tipo: 'error'; texto: string; reintentable: boolean }
  | { tipo: 'trabajando' }
  | { tipo: 'resultado'; resultado: ResultadoTanda };

const MENSAJE: Record<Decision, (r: ResultadoTanda) => string> = {
  avanzar: () => '¡Dominaste este conjunto! La próxima vez sigues con el siguiente.',
  repetir: (r) => r.correctasPrimeraVuelta < r.total
    ? 'La próxima vez repites este mismo conjunto, para hacerlo todo bien a la primera.'
    : 'Lo hiciste todo bien. La próxima vez repites este conjunto para hacerlo un poco más rápido.',
  retroceder: () => 'Vamos a repasar el conjunto anterior para afirmar la base. ¡Así se aprende!',
  repasar: () => '¡Repaso completado! Conservaste tu avance en el camino.',
};

export function Tanda({ onVolver, conjuntoId }: Props) {
  const [fase, setFase] = useState<Fase>({ tipo: 'cargando' });
  const [tanda, setTanda] = useState<TandaApi | null>(null);
  const [hojaIdx, setHojaIdx] = useState(0);
  const [elegidas, setElegidas] = useState<Record<number, string>>({});
  const [pendientes, setPendientes] = useState<Set<number>>(new Set());
  const [bien, setBien] = useState<Set<number>>(new Set());     // ya correctos: bloqueados con ✔
  const [marcados, setMarcados] = useState<Set<number>>(new Set()); // quedaron ✖ en la última revisión
  const [ronda, setRonda] = useState(1);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  const [dibujando, setDibujando] = useState(false); // bloquea el scroll mientras el alumno escribe
  const scroll = useRef<ScrollView>(null);

  const cargar = useCallback(async () => {
    setFase({ tipo: 'cargando' });
    try {
      const { tanda: t } = await api.iniciarTanda(conjuntoId);
      setTanda(t);
      setRonda(t.ronda);
      setPendientes(new Set(t.pendientes));
      setBien(new Set(t.correctasAnteriores));
      setMarcados(t.ronda > 1 ? new Set(t.pendientes) : new Set());
      setElegidas(Object.fromEntries(t.respuestas.map((r) => [r.preguntaId, (r.opcion ?? r.respuesta)!])));
      setAviso(t.ronda > 1 ? `Te quedan ${t.pendientes.length} por corregir.` : null);
      const primeraConPendiente = t.hojas.findIndex((h) => h.ejercicios.some((e) => t.pendientes.includes(e.id)));
      setHojaIdx(Math.max(0, primeraConPendiente));
      setFase({ tipo: 'trabajando' });
    } catch (e) {
      const codigo = e instanceof ApiError ? e.code : '';
      setFase({
        tipo: 'error',
        texto: e instanceof ApiError ? e.message : 'No pudimos conectarnos. Revisa internet y vuelve a intentarlo.',
        reintentable: !['SIN_CONSENTIMIENTO', 'CIERRE_NIVEL_PENDIENTE'].includes(codigo),
      });
    }
  }, [conjuntoId]);
  useEffect(() => { void cargar(); }, [cargar]);

  // Reloj de la primera vuelta (el tiempo oficial lo mide el servidor).
  useEffect(() => {
    if (fase.tipo !== 'trabajando' || ronda > 1) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [fase.tipo, ronda]);

  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [hojaIdx]);

  async function elegir(preguntaId: number, opcion: string) {
    if (!tanda || !pendientes.has(preguntaId)) return;
    const anterior = elegidas[preguntaId];
    setElegidas((x) => ({ ...x, [preguntaId]: opcion }));
    setErrorEnvio(null);
    try {
      await api.responderTanda(tanda.id, preguntaId, opcion);
    } catch (e) {
      setElegidas((x) => ({ ...x, [preguntaId]: anterior }));
      setErrorEnvio(e instanceof ApiError ? e.message : 'No se guardó tu respuesta. Revisa internet.');
    }
  }

  // v16.3: guarda un número escrito ya confirmado. Si falla, RespuestaEscrita muestra el error y deja reintentar.
  async function escribir(preguntaId: number, r: RespuestaConfirmada) {
    if (!tanda || !pendientes.has(preguntaId)) return;
    setErrorEnvio(null);
    const res = await api.responderTandaEscrita(tanda.id, preguntaId,
      { respuesta: r.texto, trazos: r.trazos, reconocido: r.reconocido, confianza: r.confianza });
    setElegidas((x) => ({ ...x, [preguntaId]: res.respuesta }));
  }

  async function revisar() {
    if (!tanda) return;
    setRevisando(true);
    setErrorEnvio(null);
    try {
      const r = await api.revisarTanda(tanda.id);
      if (r.terminado) {
        setFase({ tipo: 'resultado', resultado: r.resultado });
        return;
      }
      setRonda(r.ronda);
      setBien((b) => new Set([...b, ...r.correctas]));
      setPendientes(new Set(r.aCorregir));
      setMarcados(new Set(r.aCorregir));
      setElegidas((x) => {
        const y = { ...x };
        for (const id of r.aCorregir) delete y[id];
        return y;
      });
      setAviso(`Tienes ${r.aCorregir.length} para corregir. Mira de nuevo el ejemplo de la hoja y vuelve a intentarlo.`);
      const primera = tanda.hojas.findIndex((h) => h.ejercicios.some((e) => r.aCorregir.includes(e.id)));
      setHojaIdx(Math.max(0, primera));
    } catch (e) {
      setErrorEnvio(e instanceof ApiError ? e.message : 'No pudimos revisar. Revisa internet.');
    } finally {
      setRevisando(false);
    }
  }

  if (fase.tipo === 'cargando') {
    return (
      <View style={[styles.contenedor, styles.centro]}>
        <ActivityIndicator size="large" color={colors.cordillera} accessibilityLabel="Preparando tu tanda" />
      </View>
    );
  }
  if (fase.tipo === 'error') {
    return (
      <View style={[styles.contenedor, styles.centro]}>
        <Text style={styles.toko}>🦅</Text>
        <Text style={styles.textoError} accessibilityRole="alert">{fase.texto}</Text>
        {fase.reintentable ? <BotonGrande titulo="Intentar de nuevo" onPress={cargar} /> : null}
        <BotonGrande titulo="Volver a mi camino" onPress={onVolver} color={colors.blanco} />
      </View>
    );
  }
  if (fase.tipo === 'resultado') {
    const r = fase.resultado;
    const aTiempo = r.tiempoSeg <= r.tiempoEstandarSeg;
    return (
      <View style={[styles.contenedor, styles.centro]}>
        <Text style={styles.toko}>{r.decision === 'avanzar' ? '🎉' : '🦅'}</Text>
        <Text style={styles.titulo} accessibilityRole="header">¡Tanda terminada!</Text>
        <View style={styles.cifras}>
          <Cifra valor={`${r.correctasPrimeraVuelta}/${r.total}`} etiqueta="bien a la primera" ok={r.correctasPrimeraVuelta === r.total} />
          <Cifra valor={mmss(r.tiempoSeg)} etiqueta={`meta ${mmss(r.tiempoEstandarSeg)}`} ok={aTiempo} />
        </View>
        <Text style={styles.decision}>{MENSAJE[r.decision](r)}</Text>
        <BotonGrande titulo="Volver a mi camino" onPress={onVolver} />
      </View>
    );
  }

  // Trabajando en las hojas
  const t = tanda!;
  const hoja = t.hojas[hojaIdx];
  const faltan = [...pendientes].filter((id) => !elegidas[id]).length;
  const ultimaHoja = hojaIdx === t.hojas.length - 1;
  const transcurrido = Math.max(0, Math.round((ahora - Date.parse(t.iniciadoEn)) / 1000));
  return (
    <SafeAreaView edges={['bottom']} style={styles.contenedor}>
      <ScrollView ref={scroll} contentContainerStyle={styles.scroll} scrollEnabled={!dibujando} keyboardShouldPersistTaps="handled">
        <View style={styles.cabecera}>
          <Text style={styles.conjunto} numberOfLines={1}>{t.conjunto.titulo}</Text>
          {ronda === 1 ? (
            <Text style={styles.reloj} accessibilityLabel={`Tiempo ${mmss(transcurrido)}, meta ${mmss(t.tiempoEstandarSeg)}`}>
              ⏱ {mmss(transcurrido)} / {mmss(t.tiempoEstandarSeg)}
            </Text>
          ) : <Text style={styles.reloj}>Corrigiendo</Text>}
        </View>
        <Text style={styles.hojaN}>Hoja {hojaIdx + 1} de {t.hojas.length}{t.repeticion > 1 ? ` · intento ${t.repeticion}` : ''}</Text>
        {aviso ? <Mensaje tipo="info" texto={aviso} /> : null}

        <View style={styles.ejemplo} accessible accessibilityLabel={`Ejemplo resuelto: ${hoja.ejemplo.enunciado}. ${hoja.ejemplo.resolucion}`}>
          <Text style={styles.ejemploTitulo}>👀 Mira el ejemplo</Text>
          <Text style={styles.ejemploEnunciado}>{hoja.ejemplo.enunciado}</Text>
          <Text style={styles.ejemploResolucion}>{hoja.ejemplo.resolucion}</Text>
        </View>

        {hoja.ejercicios.map((e, i) => {
          const correcto = bien.has(e.id);
          const marcado = marcados.has(e.id);
          return (
            <View key={e.id} style={[styles.ejercicio, correcto && styles.ejercicioBien, marcado && styles.ejercicioMal]}>
              <Text style={styles.enunciado}>
                {correcto ? '✔ ' : marcado ? '✖ ' : ''}{i + 1}. {e.enunciado.split(/(\[\[[0-9]\]\])/g).map((parte,j)=>
                /^\[\[[0-9]\]\]$/.test(parte)?<Text key={j} style={styles.digito}>{parte.slice(2,-2)}</Text>:<Text key={j}>{parte}</Text>)}
              </Text>
              {e.formatoRespuesta && e.formatoRespuesta !== 'alternativas' ? (
                correcto ? (
                  <Text style={styles.escritaBien}>✔ {elegidas[e.id] ? `${e.prefijo ? `${e.prefijo} ` : ''}${elegidas[e.id]}${e.sufijo ? ` ${e.sufijo}` : ''}` : 'Correcto'}</Text>
                ) : (
                  // La key cambia en cada ronda: un ejercicio marcado ✖ vuelve con el lienzo limpio.
                  <RespuestaEscrita key={`${e.id}-${ronda}`} formato={e.formatoRespuesta}
                    prefijo={e.prefijo} sufijo={e.sufijo} guardada={elegidas[e.id] ?? null}
                    deshabilitada={!pendientes.has(e.id)} onDibujando={setDibujando}
                    onConfirmar={(r) => escribir(e.id, r)} />
                )
              ) : (
              <View style={styles.opciones}>
                {e.opciones.map((o) => {
                  const sel = elegidas[e.id] === o.clave;
                  return (
                    <Pressable
                      key={o.clave}
                      onPress={() => elegir(e.id, o.clave)}
                      disabled={correcto || !pendientes.has(e.id)}
                      accessibilityRole="radio"
                      accessibilityLabel={`${o.clave}: ${o.texto}`}
                      accessibilityState={{ checked: sel, disabled: correcto }}
                      aria-checked={sel}
                      style={[styles.opcion, sel && styles.opcionSel, correcto && styles.opcionBloqueada]}
                    >
                      <Text style={[styles.textoOpcion, sel && styles.textoOpcionSel]}>{o.texto}</Text>
                    </Pressable>
                  );
                })}
              </View>
              )}
            </View>
          );
        })}
        {errorEnvio ? <Mensaje tipo="error" texto={errorEnvio} /> : null}
      </ScrollView>

      <View style={styles.pie}>
        <View style={styles.navegacion}>
          {hojaIdx > 0 ? (
            <View style={{ flex: 1 }}><BotonGrande titulo="← Hoja anterior" onPress={() => setHojaIdx((h) => h - 1)} color={colors.blanco} /></View>
          ) : null}
          {!ultimaHoja ? (
            <View style={{ flex: 1 }}><BotonGrande titulo="Siguiente hoja →" onPress={() => setHojaIdx((h) => h + 1)} /></View>
          ) : null}
        </View>
        {ultimaHoja || faltan === 0 ? (
          <BotonGrande
            titulo={revisando ? 'Revisando…' : faltan ? `Te falta${faltan === 1 ? '' : 'n'} ${faltan}` : ronda === 1 ? 'Terminé: revisar' : 'Revisar de nuevo'}
            onPress={revisar}
            deshabilitado={revisando || faltan > 0}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Cifra({ valor, etiqueta, ok }: { valor: string; etiqueta: string; ok: boolean }) {
  return (
    <View style={[styles.cifra, ok ? styles.cifraOk : styles.cifraNo]}>
      <Text style={styles.cifraValor}>{ok ? '✔ ' : ''}{valor}</Text>
      <Text style={styles.cifraEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.cielo },
  centro: { justifyContent: 'center', padding: 24 },
  scroll: { padding: 20, paddingTop: 18, paddingBottom: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  conjunto: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.cordillera },
  reloj: { fontSize: 16, fontWeight: '700', color: colors.texto },
  hojaN: { fontSize: 15, color: colors.textoSuave, marginVertical: 6 },
  ejemplo: { backgroundColor: '#FFF6D5', borderRadius: sizes.radio, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: colors.sol },
  ejemploTitulo: { fontSize: 15, fontWeight: '800', color: '#8A5300', marginBottom: 4 },
  ejemploEnunciado: { fontSize: 20, fontWeight: '800', color: colors.texto, marginBottom: 6 },
  ejemploResolucion: { fontSize: 17, color: colors.texto, lineHeight: 26 },
  ejercicio: { backgroundColor: colors.blanco, borderRadius: sizes.radio, padding: 14, marginBottom: 10, borderWidth: 3, borderColor: 'transparent' },
  ejercicioBien: { borderColor: colors.pasto, opacity: 0.75 },
  ejercicioMal: { borderColor: colors.error },
  enunciado: { fontSize: 20, fontWeight: '700', color: colors.texto, marginBottom: 8 },
  digito:{color:'#B24700',backgroundColor:'#FFE0A6',fontWeight:'900',textDecorationLine:'underline'},
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  escritaBien: { fontSize: 22, fontWeight: '900', color: colors.pasto },
  opcion: {
    minWidth: 72, minHeight: 52, paddingHorizontal: 12, borderRadius: 14, borderWidth: 2, borderColor: colors.cordillera,
    justifyContent: 'center', alignItems: 'center', backgroundColor: colors.blanco,
  },
  opcionSel: { backgroundColor: colors.cordillera },
  opcionBloqueada: { borderColor: '#C9DCEB' },
  textoOpcion: { fontSize: 20, fontWeight: '800', color: colors.cordillera },
  textoOpcionSel: { color: colors.blanco },
  pie: { paddingHorizontal: 16, paddingBottom: 18, maxWidth: 560, width: '100%', alignSelf: 'center' },
  navegacion: { flexDirection: 'row', gap: 8 },
  salir: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  textoSalir: { fontSize: 15, color: colors.cordillera, textDecorationLine: 'underline' },
  toko: { fontSize: 72, textAlign: 'center' },
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera, textAlign: 'center' },
  cifras: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  cifra: { flex: 1, borderRadius: sizes.radio, padding: 14, alignItems: 'center' },
  cifraOk: { backgroundColor: '#E6F4EA' },
  cifraNo: { backgroundColor: colors.blanco },
  cifraValor: { fontSize: 28, fontWeight: '800', color: colors.texto },
  cifraEtiqueta: { fontSize: 15, color: colors.textoSuave },
  decision: { fontSize: 19, color: colors.texto, textAlign: 'center', marginBottom: 16, lineHeight: 27 },
  textoError: { fontSize: 19, color: colors.texto, textAlign: 'center', marginVertical: 12 },
});
