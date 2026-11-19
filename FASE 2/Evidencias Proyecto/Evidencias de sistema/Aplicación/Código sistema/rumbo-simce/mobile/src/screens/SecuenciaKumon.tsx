// CU18 — Secuencia Kumon (administrador): niveles y conjuntos en orden, con su objetivo de aprendizaje,
// sus hojas (ejemplo resuelto + ejercicios) y el tiempo estándar, que se ajusta aquí cuando lo fije el profesor Kumon.
// El contenido de la v12 está alineado con los OA entregados por Mineduc y usa ejercicios originales.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, ConjuntoAdmin, DetalleConjunto, NivelAdmin } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { Tarjeta } from '../components/Tarjeta';
import { mmss } from '../tiempo';
import { colors, sizes } from '../theme';
import { mensajeDeError } from '../validacion';

export function SecuenciaKumon({ onVolver }: { onVolver: () => void }) {
  const [niveles, setNiveles] = useState<NivelAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try { setNiveles((await api.secuencia()).niveles); } catch (e) { setError(mensajeDeError(e)); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  return (
    <Pantalla centrada={false}>
      <Text style={styles.titulo} accessibilityRole="header">Secuencia Kumon</Text>
      <Mensaje tipo="info" texto="Cinco unidades de Matemática 4° básico: 17 conjuntos con ejemplos y actividades originales de progresión individualizada. El tiempo estándar es ajustable por el equipo docente." />
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      {!niveles && !error ? <ActivityIndicator size="large" color={colors.cordillera} /> : null}
      {niveles?.map((n) => (
        <View key={n.id}>
          <Text style={styles.nivel} accessibilityRole="header">{n.nombre}</Text>
          {n.conjuntos.map((c) => <TarjetaConjunto key={c.id} conjunto={c} />)}
        </View>
      ))}
      <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
    </Pantalla>
  );
}

function TarjetaConjunto({ conjunto }: { conjunto: ConjuntoAdmin }) {
  const [c, setC] = useState(conjunto);
  const [tiempo, setTiempo] = useState(conjunto.tiempoEstandarSeg);
  const [detalle, setDetalle] = useState<DetalleConjunto | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true); setEstado(null);
    try {
      const r = await api.editarConjunto(c.id, { tiempoEstandarSeg: tiempo });
      setC({ ...c, tiempoEstandarSeg: r.conjunto.tiempoEstandarSeg });
      setEstado({ tipo: 'exito', texto: 'Tiempo estándar guardado. Aplica a las tandas que empiecen desde ahora.' });
    } catch (e) {
      setEstado({ tipo: 'error', texto: mensajeDeError(e) });
    } finally { setGuardando(false); }
  }

  async function alternar() {
    if (abierto) return setAbierto(false);
    setAbierto(true);
    if (!detalle) {
      try { setDetalle((await api.conjuntoAdmin(c.id)).conjunto); } catch (e) { setEstado({ tipo: 'error', texto: mensajeDeError(e) }); }
    }
  }

  const cambio = tiempo !== c.tiempoEstandarSeg;
  return (
    <Tarjeta titulo={`${c.codigo} · ${c.titulo}`}>
      <Text style={styles.dato}>🎯 {c.objetivoAprendizaje}</Text>
      <Text style={styles.dato}>{c.hojas} hojas · {c.ejercicios} ejercicios por tanda</Text>
      <Text style={styles.dato}>
        {c.intentos ? `${c.intentos} intentos · ${c.porcentajeCumpleEstandar ?? 0}% alcanzó el estándar` : 'Sin intentos todavía'}
      </Text>
      <Text style={styles.etiqueta}>Tiempo estándar</Text>
      <View style={styles.fila}>
        <Pressable onPress={() => setTiempo((t) => Math.max(15, t - 15))} accessibilityRole="button"
          accessibilityLabel="Restar 15 segundos" style={styles.paso}><Text style={styles.pasoTexto}>−15 s</Text></Pressable>
        <Text style={styles.tiempo} accessibilityLabel={`Tiempo estándar ${mmss(tiempo)}`}>{mmss(tiempo)}</Text>
        <Pressable onPress={() => setTiempo((t) => Math.min(3600, t + 15))} accessibilityRole="button"
          accessibilityLabel="Sumar 15 segundos" style={styles.paso}><Text style={styles.pasoTexto}>+15 s</Text></Pressable>
      </View>
      {estado ? <Mensaje tipo={estado.tipo} texto={estado.texto} /> : null}
      {cambio ? <BotonGrande titulo={guardando ? 'Guardando…' : 'Guardar tiempo'} onPress={guardar} deshabilitado={guardando} /> : null}
      <BotonGrande titulo={abierto ? 'Ocultar hojas' : 'Ver hojas'} onPress={alternar} color={colors.cielo} />
      {abierto && detalle ? detalle.hojas.map((h) => (
        <View key={h.id} style={styles.hoja}>
          <Text style={styles.hojaTitulo}>Hoja {h.orden}</Text>
          <Text style={styles.ejemplo}>Ejemplo: {h.ejemplo.enunciado}</Text>
          <Text style={styles.resolucion}>{h.ejemplo.resolucion}</Text>
          {h.ejercicios.map((e, i) => (
            <Text key={e.id} style={styles.ejercicio}>{i + 1}. {e.enunciado}  <Text style={styles.correcta}>({e.respuestaCorrecta})</Text></Text>
          ))}
        </View>
      )) : null}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera, marginBottom: 8 },
  nivel: { fontSize: 20, fontWeight: '800', color: colors.cordillera, marginTop: 12, marginBottom: 8 },
  dato: { fontSize: 15, color: colors.texto, marginBottom: 2 },
  etiqueta: { fontSize: 15, fontWeight: '700', color: colors.cordillera, marginTop: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  paso: { minWidth: 64, minHeight: 48, borderRadius: 12, borderWidth: 2, borderColor: colors.cordillera, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.blanco },
  pasoTexto: { fontSize: 16, fontWeight: '700', color: colors.cordillera },
  tiempo: { fontSize: 26, fontWeight: '800', color: colors.texto, minWidth: 70, textAlign: 'center' },
  hoja: { backgroundColor: colors.blanco, borderRadius: 12, padding: 12, marginTop: 8 },
  hojaTitulo: { fontSize: 16, fontWeight: '800', color: colors.cordillera },
  ejemplo: { fontSize: 15, fontWeight: '700', color: colors.texto, marginTop: 4 },
  resolucion: { fontSize: 14, color: colors.textoSuave, marginBottom: 6, lineHeight: 20 },
  ejercicio: { fontSize: 15, color: colors.texto, paddingVertical: 2 },
  correcta: { color: colors.pasto, fontWeight: '700' },
});
