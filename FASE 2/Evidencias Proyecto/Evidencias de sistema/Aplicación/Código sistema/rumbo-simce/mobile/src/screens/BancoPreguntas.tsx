// CU08 — Gestionar banco de preguntas por eje (administrador).
// En la app: ver la cobertura por isla y dificultad, revisar cada pregunta, marcarla como revisada
// pedagógicamente, activarla o desactivarla, y crear o editar preguntas (FormularioPregunta, semana 4).
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, PreguntaBanco, ResumenEjeBanco } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { Tarjeta } from '../components/Tarjeta';
import { FormularioPregunta } from './FormularioPregunta';
import { colors, sizes } from '../theme';
import { mensajeDeError } from '../validacion';

export function BancoPreguntas({ onVolver }: { onVolver: () => void }) {
  const [resumen, setResumen] = useState<ResumenEjeBanco[] | null>(null);
  const [eje, setEje] = useState<ResumenEjeBanco | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setResumen((await api.resumenBanco()).ejes);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  if (eje) return <PreguntasDeEje eje={eje} onVolver={() => { setEje(null); void cargar(); }} />;

  return (
    <Pantalla centrada={false}>
      <Text style={styles.titulo} accessibilityRole="header">Banco de preguntas</Text>
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      {!resumen && !error ? <ActivityIndicator size="large" color={colors.cordillera} /> : null}
      {resumen?.map((e) => (
        <Pressable key={e.id} onPress={() => setEje(e)} accessibilityRole="button"
          accessibilityLabel={`${e.nombre}: ${e.activas} preguntas activas, ${e.revisadas} revisadas`}>
          <Tarjeta titulo={`${e.isla} · ${e.nombre}`}>
            <Text style={styles.texto}>{e.activas} activas · {e.revisadas} revisadas · {e.inactivas} inactivas</Text>
            <Text style={styles.textoSuave}>
              Por nivel: {[1, 2, 3, 4, 5].filter((d) => d <= 3 || e.porDificultad[d])
                .map((d) => `N${d}: ${e.porDificultad[d] ?? 0}`).join('  ')}
            </Text>
            {e.revisadas < e.activas ? (
              <Text style={styles.pendiente}>⚠ {e.activas - e.revisadas} pendientes de revisión pedagógica</Text>
            ) : null}
          </Tarjeta>
        </Pressable>
      ))}
      <Mensaje tipo="info" texto="Entra a una isla para revisar sus preguntas, editarlas o agregar nuevas." />
      <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
    </Pantalla>
  );
}

function PreguntasDeEje({ eje, onVolver }: { eje: ResumenEjeBanco; onVolver: () => void }) {
  const [preguntas, setPreguntas] = useState<PreguntaBanco[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.preguntasDeEje(eje.codigo).then((r) => setPreguntas(r.preguntas)).catch((e) => setError(mensajeDeError(e)));
  }, [eje.codigo]);

  const [editando, setEditando] = useState<PreguntaBanco | 'nueva' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const reemplazar = (p: PreguntaBanco) => setPreguntas((ps) => ps?.map((x) => (x.id === p.id ? p : x)) ?? null);

  if (editando) {
    return (
      <FormularioPregunta
        eje={eje}
        pregunta={editando === 'nueva' ? undefined : editando}
        onCancelar={() => setEditando(null)}
        onGuardada={(p) => {
          setPreguntas((ps) => (editando === 'nueva' ? [...(ps ?? []), p] : ps?.map((x) => (x.id === p.id ? p : x)) ?? null));
          setAviso(editando === 'nueva' ? `Pregunta creada${p.codigo ? ` (${p.codigo})` : ''}. Queda pendiente de revisión.` : 'Cambios guardados.');
          setEditando(null);
        }}
      />
    );
  }

  return (
    <Pantalla centrada={false}>
      <Text style={styles.titulo} accessibilityRole="header">{eje.nombre}</Text>
      {aviso ? <Mensaje tipo="exito" texto={aviso} /> : null}
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      {!preguntas && !error ? <ActivityIndicator size="large" color={colors.cordillera} /> : null}
      <BotonGrande titulo="Nueva pregunta" onPress={() => { setAviso(null); setEditando('nueva'); }} />
      {preguntas?.map((p) => (
        <TarjetaPregunta key={p.id} pregunta={p} onCambio={reemplazar} onEditar={() => { setAviso(null); setEditando(p); }} />
      ))}
      <BotonGrande titulo="Volver" onPress={onVolver} color={colors.blanco} />
    </Pantalla>
  );
}

function TarjetaPregunta({ pregunta: p, onCambio, onEditar }: {
  pregunta: PreguntaBanco; onCambio: (p: PreguntaBanco) => void; onEditar: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(cambios: { activa?: boolean; revisadaPedagogicamente?: boolean }) {
    setGuardando(true);
    setError(null);
    try {
      onCambio((await api.editarPregunta(p.id, cambios)).pregunta);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={[styles.pregunta, !p.activa && styles.inactiva]}>
      <Text style={styles.meta}>
        {p.codigo ?? `#${p.id}`} · Nivel {p.dificultad} · {p.estrategia}
        {p.vecesRespondida ? ` · ${p.porcentajeAcierto}% de acierto (${p.vecesRespondida})` : ''}
      </Text>
      <Text style={styles.enunciado}>{p.enunciado}</Text>
      {p.opciones.map((o) => (
        <Text key={o.clave} style={[styles.opcion, o.clave === p.respuestaCorrecta && styles.correcta]}>
          {o.clave === p.respuestaCorrecta ? '✔' : '·'} {o.clave}) {o.texto}
          {o.tipoError ? <Text style={styles.tipoError}>  [{o.tipoError}]</Text> : null}
        </Text>
      ))}
      <Text style={styles.explicacion}>💬 {p.explicacion}</Text>
      <Text style={styles.estado}>
        {p.activa ? 'Activa' : 'Inactiva'} · {p.revisadaPedagogicamente ? '✔ Revisada' : '⚠ Pendiente de revisión'}
      </Text>
      {error ? <Mensaje tipo="error" texto={error} /> : null}
      <View style={styles.acciones}>
        <View style={{ flex: 1 }}>
          <BotonGrande titulo={p.revisadaPedagogicamente ? 'Quitar revisión' : 'Marcar revisada'}
            onPress={() => cambiar({ revisadaPedagogicamente: !p.revisadaPedagogicamente })} deshabilitado={guardando} />
        </View>
        <View style={{ flex: 1 }}>
          <BotonGrande titulo={p.activa ? 'Desactivar' : 'Activar'} color={colors.cielo}
            onPress={() => cambiar({ activa: !p.activa })} deshabilitado={guardando} />
        </View>
      </View>
      <BotonGrande titulo="Editar" onPress={onEditar} color={colors.cielo} deshabilitado={guardando} />
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera, marginBottom: 12 },
  texto: { fontSize: 17, color: colors.texto },
  textoSuave: { fontSize: 15, color: colors.textoSuave, marginTop: 4 },
  pendiente: { fontSize: 15, color: '#8A5300', marginTop: 4, fontWeight: '600' },
  pregunta: { backgroundColor: colors.blanco, borderRadius: sizes.radio, padding: 16, marginBottom: 12 },
  inactiva: { opacity: 0.6 },
  meta: { fontSize: 14, color: colors.textoSuave, marginBottom: 4 },
  enunciado: { fontSize: 18, fontWeight: '700', color: colors.texto, marginBottom: 6 },
  opcion: { fontSize: 16, color: colors.texto, paddingVertical: 2 },
  correcta: { color: colors.pasto, fontWeight: '700' },
  tipoError: { fontSize: 13, color: colors.textoSuave, fontWeight: '400' },
  explicacion: { fontSize: 15, color: colors.textoSuave, marginTop: 8, lineHeight: 21 },
  estado: { fontSize: 15, fontWeight: '600', color: colors.cordillera, marginTop: 8 },
  acciones: { flexDirection: 'row', gap: 8 },
});
