// v16: respuesta escrita a mano para el diagnóstico y los facsímiles (pruebas de unidad y ensayo).
// 1) el alumno escribe con el dedo o el lápiz, 2) el servidor lee el número,
// 3) el alumno confirma lo leído (o corrige) y recién ahí se guarda la respuesta.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, FormatoRespuesta, LecturaNumero } from '../api';
import { colors } from '../theme';
import { mensajeDeError } from '../validacion';
import { Mensaje } from './Mensaje';
import { PizarraNumero } from './PizarraNumero';
import { Trazo } from './Trazos';

export interface RespuestaConfirmada { texto: string; trazos: Trazo[][]; reconocido: string; confianza: number }

type Campo = 'unico' | 'num' | 'den';

function Boton({ titulo, onPress, primario, deshabilitado }: { titulo: string; onPress: () => void; primario?: boolean; deshabilitado?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={deshabilitado} accessibilityRole="button" accessibilityState={{ disabled: !!deshabilitado }}
      style={({ pressed }) => [styles.boton, primario && styles.botonPrimario, (pressed || deshabilitado) && { opacity: 0.6 }]}>
      <Text style={[styles.botonTexto, primario && styles.botonTextoPrimario]}>{titulo}</Text>
    </Pressable>
  );
}

export function RespuestaEscrita({ formato, prefijo, sufijo, guardada, onConfirmar, deshabilitada, onDibujando }: {
  formato: FormatoRespuesta; prefijo?: string | null; sufijo?: string | null;
  guardada: string | null; deshabilitada?: boolean; onDibujando?: (activo: boolean) => void;
  onConfirmar: (r: RespuestaConfirmada) => Promise<void> | void;
}) {
  const fraccion = formato === 'fraccion';
  const [trazos, setTrazos] = useState<Record<Campo, Trazo[]>>({ unico: [], num: [], den: [] });
  const [lectura, setLectura] = useState<Record<Campo, LecturaNumero | null> | null>(null);
  const [leidoOriginal, setLeidoOriginal] = useState(''); // lo que leyó el sistema, antes de correcciones del alumno
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(guardada == null);
  const campos: Campo[] = fraccion ? ['num', 'den'] : ['unico'];
  const vacio = campos.some((c) => trazos[c].length === 0);

  const cambiar = (c: Campo, t: Trazo[]) => { setTrazos((v) => ({ ...v, [c]: t })); setLectura(null); setError(null); };
  const deshacer = () => {
    const c = [...campos].reverse().find((k) => trazos[k].length);
    if (c) cambiar(c, trazos[c].slice(0, -1));
  };
  const borrar = () => { setTrazos({ unico: [], num: [], den: [] }); setLectura(null); setError(null); };

  async function leer() {
    setLeyendo(true); setError(null);
    try {
      const r: Record<Campo, LecturaNumero | null> = { unico: null, num: null, den: null };
      for (const c of campos) {
        r[c] = (await api.reconocerNumero(trazos[c], fraccion ? 'entero' : formato)).lectura;
        if (!r[c]!.texto) throw new Error('No pude leer ningún número. Escríbelo un poco más grande.');
      }
      setLectura(r);
      setLeidoOriginal(fraccion ? `${r.num!.texto}/${r.den!.texto}` : r.unico!.texto);
    } catch (e) { setError(e instanceof Error && !('status' in e) ? e.message : mensajeDeError(e)); }
    finally { setLeyendo(false); }
  }

  // Cambia un dígito dudoso por una de sus alternativas.
  function elegirAlternativa(c: Campo, i: number, valor: string) {
    if (!lectura?.[c]) return;
    const l = lectura[c]!;
    const caracteres = l.caracteres.map((x, j) => (j === i ? { ...x, valor, confianza: 1, alternativas: [] } : x));
    const nuevo = { ...l, caracteres, texto: caracteres.map((x) => x.valor).join('') };
    nuevo.dudoso = caracteres.some((x) => x.tipo === 'digito' && x.confianza < 0.7);
    setLectura({ ...lectura, [c]: nuevo });
  }

  const textoLeido = lectura ? (fraccion ? `${lectura.num?.texto}/${lectura.den?.texto}` : lectura.unico?.texto ?? '') : '';

  async function confirmar() {
    if (!lectura) return;
    const ls = campos.map((c) => lectura[c]!);
    try {
      await onConfirmar({
        texto: textoLeido,
        trazos: campos.map((c) => trazos[c]),
        reconocido: leidoOriginal,
        confianza: Math.min(...ls.map((l) => l.confianza)),
      });
      setEditando(false); borrar();
    } catch (e) { setError(mensajeDeError(e)); }
  }

  if (!editando && guardada != null) {
    return (
      <View style={styles.guardada}>
        <Text style={styles.guardadaEtiqueta}>Tu respuesta</Text>
        <Text style={styles.guardadaValor} accessibilityLabel={`Tu respuesta: ${guardada}`}>
          {prefijo ? `${prefijo} ` : ''}{guardada}{sufijo ? ` ${sufijo}` : ''} ✔
        </Text>
        {!deshabilitada ? <Boton titulo="✏️ Cambiar respuesta" onPress={() => setEditando(true)} /> : null}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.instruccion}>
        {fraccion ? 'Escribe el numerador arriba y el denominador abajo.'
          : formato === 'decimal' ? 'Escribe tu respuesta. Si lleva decimales, usa una coma: 3,5'
          : 'Escribe tu respuesta con números.'}
        {sufijo ? ` (en ${sufijo})` : ''}
      </Text>
      {fraccion ? (
        <View style={styles.fraccion}>
          <PizarraNumero trazos={trazos.num} onCambio={(t) => cambiar('num', t)} alto={130} deshabilitada={deshabilitada} etiqueta="Numerador" onDibujando={onDibujando} />
          <View style={styles.barra} />
          <PizarraNumero trazos={trazos.den} onCambio={(t) => cambiar('den', t)} alto={130} deshabilitada={deshabilitada} etiqueta="Denominador" onDibujando={onDibujando} />
        </View>
      ) : (
        <View style={styles.fila}>
          {prefijo ? <Text style={styles.afijo}>{prefijo}</Text> : null}
          <View style={{ flex: 1 }}><PizarraNumero trazos={trazos.unico} onCambio={(t) => cambiar('unico', t)} deshabilitada={deshabilitada} onDibujando={onDibujando} /></View>
          {sufijo ? <Text style={styles.afijo}>{sufijo}</Text> : null}
        </View>
      )}

      <View style={styles.acciones}>
        <Boton titulo="↶ Deshacer" onPress={deshacer} deshabilitado={vacio && campos.every((c) => !trazos[c].length)} />
        <Boton titulo="🗑 Borrar" onPress={borrar} />
        {guardada != null ? <Boton titulo="Cancelar" onPress={() => { borrar(); setEditando(false); }} /> : null}
      </View>

      {error ? <Mensaje tipo="error" texto={error} /> : null}

      {!lectura ? (
        <Boton primario titulo={leyendo ? 'Leyendo…' : 'Listo, leer mi número'} onPress={() => void leer()} deshabilitado={vacio || leyendo || deshabilitada} />
      ) : (
        <View style={styles.lectura}>
          <Text style={styles.lecturaEtiqueta}>Leí:</Text>
          <Text style={styles.lecturaValor} accessibilityLabel={`Leí ${textoLeido}`}>
            {prefijo ? `${prefijo} ` : ''}{textoLeido}{sufijo ? ` ${sufijo}` : ''}
          </Text>
          {campos.map((c) => lectura[c]!.caracteres.map((ch, i) => ch.tipo === 'digito' && ch.confianza < 0.7 && ch.alternativas.length ? (
            <View key={`${c}${i}`} style={styles.duda}>
              <Text style={styles.dudaTexto}>¿El {i + 1}.º número{c === 'den' ? ' de abajo' : c === 'num' ? ' de arriba' : ''} es…?</Text>
              {[ch.valor, ...ch.alternativas.map((a) => a.valor)].map((v) => (
                <Pressable key={v} onPress={() => elegirAlternativa(c, i, v)} style={styles.chip} accessibilityRole="button">
                  <Text style={styles.chipTexto}>{v}</Text>
                </Pressable>
              ))}
            </View>
          ) : null))}
          <Boton primario titulo="✔ Sí, esa es mi respuesta" onPress={() => void confirmar()} />
          <Boton titulo="✏️ No, quiero escribir de nuevo" onPress={borrar} />
        </View>
      )}
      {leyendo ? <ActivityIndicator color={colors.cordillera} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  instruccion: { fontSize: 16, color: colors.texto, marginBottom: 8, lineHeight: 22 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  afijo: { fontSize: 26, fontWeight: '800', color: colors.cordillera },
  fraccion: { gap: 6 },
  barra: { height: 5, borderRadius: 3, backgroundColor: colors.cordillera, marginHorizontal: 30, marginVertical: 4 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  boton: { minHeight: 52, paddingHorizontal: 18, borderRadius: 14, borderWidth: 2, borderColor: colors.cordillera, backgroundColor: colors.blanco, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  botonPrimario: { backgroundColor: colors.cordillera },
  botonTexto: { fontSize: 17, fontWeight: '800', color: colors.cordillera },
  botonTextoPrimario: { color: colors.blanco },
  lectura: { backgroundColor: '#FFF8E5', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.sol },
  lecturaEtiqueta: { fontSize: 15, color: colors.textoSuave, fontWeight: '700' },
  lecturaValor: { fontSize: 44, fontWeight: '900', color: colors.cordillera, letterSpacing: 2, marginBottom: 6 },
  duda: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 },
  dudaTexto: { fontSize: 15, color: colors.texto },
  chip: { minWidth: 48, minHeight: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.cordillera, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blanco },
  chipTexto: { fontSize: 22, fontWeight: '900', color: colors.cordillera },
  guardada: { backgroundColor: '#EAF6EC', borderRadius: 16, padding: 14 },
  guardadaEtiqueta: { fontSize: 15, color: colors.textoSuave, fontWeight: '700' },
  guardadaValor: { fontSize: 36, fontWeight: '900', color: colors.cordillera, marginBottom: 6 },
});
