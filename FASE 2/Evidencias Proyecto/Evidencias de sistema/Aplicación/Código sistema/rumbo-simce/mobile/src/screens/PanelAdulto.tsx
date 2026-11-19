// Inicio del adulto, según su rol:
//   apoderado → consentimiento (CU03) y estudiantes (CU04 / CU06)
//   docente   → cursos (CU05)
//   admin     → secuencia Kumon (CU18) y banco de ejercicios (CU08)
// El panel del apoderado (CU16) llega en el Sprint 6; el del docente (CU17) pasó a la fase siguiente.
import { StyleSheet, Text } from 'react-native';
import { Usuario } from '../api';
import { BotonGrande } from '../components/BotonGrande';
import { Mensaje } from '../components/Mensaje';
import { Pantalla } from '../components/Pantalla';
import { colors, sizes } from '../theme';

export type DestinoAdulto = 'perfil' | 'consentimiento' | 'estudiantes' | 'cursos' | 'banco' | 'secuencia' | 'videollamadas' | 'revisiones' | 'progreso';

interface Props {
  usuario: Usuario;
  onIr: (destino: DestinoAdulto) => void;
  onSalir: () => void;
}

const NOMBRE_ROL = { apoderado: 'Apoderado/a', docente: 'Docente', admin: 'Administrador/a' } as const;

export function PanelAdulto({ usuario, onIr, onSalir }: Props) {
  return (
    <Pantalla>
      <Text style={styles.titulo}>Hola, {usuario.nombre}</Text>
      <Text style={styles.rol}>{NOMBRE_ROL[usuario.rol]}</Text>

      {usuario.rol === 'apoderado' ? (
        <>
          <BotonGrande titulo="Mis estudiantes" onPress={() => onIr('estudiantes')} />
          <BotonGrande titulo="Ver progreso de mis estudiantes" onPress={() => onIr('progreso')} />
          <BotonGrande titulo="Permiso de uso de datos" onPress={() => onIr('consentimiento')} color={colors.blanco} />

        </>
      ) : null}

      {usuario.rol === 'docente' ? (
        <>
          <BotonGrande titulo="Mis cursos" onPress={() => onIr('cursos')} />
          <BotonGrande titulo="Ver progreso de mis estudiantes" onPress={() => onIr('progreso')} />
          <BotonGrande titulo="Pruebas a revisar" onPress={() => onIr('revisiones')} />
          <BotonGrande titulo="Solicitudes de videollamada" onPress={() => onIr('videollamadas')} />

        </>
      ) : null}

      {usuario.rol === 'admin' ? (
        <>
          <BotonGrande titulo="Secuencia Kumon" onPress={() => onIr('secuencia')} />
          <BotonGrande titulo="Banco de preguntas" onPress={() => onIr('banco')} color={colors.blanco} />
        </>
      ) : null}

      <BotonGrande titulo="Mi perfil" onPress={() => onIr('perfil')} color={colors.blanco} />
      <BotonGrande titulo="Cerrar sesión" onPress={onSalir} color={colors.blanco} />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: sizes.titulo, fontWeight: '800', color: colors.cordillera },
  rol: { fontSize: 18, color: colors.textoSuave, marginBottom: 12 },
});
