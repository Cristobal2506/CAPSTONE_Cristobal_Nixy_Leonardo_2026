import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { api, ApiError, Estudiante, onSesionExpirada, setToken, Usuario } from './src/api';
import { borrarSesion, guardarSesion, leerSesion } from './src/sesion';
import { BancoPreguntas } from './src/screens/BancoPreguntas';
import { Bienvenida } from './src/screens/Bienvenida';
import { Consentimiento } from './src/screens/Consentimiento';
import { LoginAdulto } from './src/screens/LoginAdulto';
import { LoginEstudiante } from './src/screens/LoginEstudiante';
import { MisCursos } from './src/screens/MisCursos';
import { MiCamino } from './src/screens/MiCamino';
import { MisEstudiantes } from './src/screens/MisEstudiantes';
import { PanelAdulto } from './src/screens/PanelAdulto';
import { Perfil } from './src/screens/Perfil';
import { RecuperarClave } from './src/screens/RecuperarClave';
import { Registro } from './src/screens/Registro';
import { SecuenciaKumon } from './src/screens/SecuenciaKumon';
import { Tanda } from './src/screens/Tanda';
import { Evaluaciones } from './src/screens/Evaluaciones';
import { RendirEvaluacion } from './src/screens/RendirEvaluacion';
import { RevisionesUnidad } from './src/screens/RevisionesUnidad';
import { Videollamadas } from './src/screens/Videollamadas';
import { colors } from './src/theme';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DiagnosticoInicio } from './src/screens/DiagnosticoInicio';
import { Notificaciones } from './src/screens/Notificaciones';
import { ProgresoV14 } from './src/screens/ProgresoV14';
import { CabeceraSesion } from './src/components/CabeceraSesion';

// Navegación mínima por estado (Sprints 1–2).
// TODO Sprint 3: migrar a Expo Router (ya hay 14 pantallas y el botón «atrás» de Android no las recorre).
type Pantalla =
  | { tipo: 'cargando' }
  | { tipo: 'bienvenida' }
  | { tipo: 'loginEstudiante' }
  | { tipo: 'loginAdulto'; aviso?: string }
  | { tipo: 'registro' }
  | { tipo: 'recuperar'; email: string }
  | { tipo: 'camino'; apodo: string; avatar?: string }
  | { tipo: 'diagnosticoInicio'; apodo: string; avatar?: string }
  | { tipo: 'tanda'; apodo: string; avatar?: string; conjuntoId?: number }
  | { tipo: 'evaluacionesEstudiante'; apodo: string; avatar?: string }
  | { tipo: 'evaluacion'; evaluacionId: number; apodo: string; avatar?: string; diagnostico?: boolean }
  | { tipo: 'revisiones'; usuario: Usuario }
  | { tipo: 'panelAdulto'; usuario: Usuario }
  | { tipo: 'perfil'; usuario: Usuario }
  | { tipo: 'consentimiento'; usuario: Usuario; volverA: 'panel' | 'estudiantes' }
  | { tipo: 'estudiantes'; usuario: Usuario }
  | { tipo: 'cursos'; usuario: Usuario }
  | { tipo: 'banco'; usuario: Usuario }
  | { tipo: 'secuencia'; usuario: Usuario }
  | { tipo: 'videollamadasEstudiante'; apodo: string; avatar?: string }
  | { tipo: 'videollamadas'; usuario: Usuario };

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: 'cargando' });
  const [avisosAbiertos, setAvisosAbiertos] = useState(false);
  const [progresoAbierto,setProgresoAbierto]=useState(false);
  const [actualizacionAvisos, setActualizacionAvisos] = useState(0);

  // CU01 — cerrar sesión: olvida el token en memoria y en el dispositivo.
  const salir = useCallback(async () => {
    setAvisosAbiertos(false);
    setProgresoAbierto(false);
    setToken(null);
    await borrarSesion();
    setPantalla({ tipo: 'bienvenida' });
  }, []);

  // CU01 — al abrir la app se recupera la sesión guardada.
  useEffect(() => {
    onSesionExpirada(() => { void salir(); });
    (async () => {
      const guardada = await leerSesion();
      if (!guardada) return setPantalla({ tipo: 'bienvenida' });
      setToken(guardada.token);
      try {
        const perfil = await api.me(); // valida que el token siga vigente y trae datos frescos
        if (perfil.rol === 'estudiante') setPantalla({ tipo: 'diagnosticoInicio', apodo: perfil.estudiante.apodo, avatar: perfil.estudiante.avatar });
        else setPantalla({ tipo: 'panelAdulto', usuario: perfil.usuario });
      } catch (e) {
        if (e instanceof ApiError) return salir(); // token vencido o cuenta inexistente
        // Sin conexión: se entra con los datos guardados; las pantallas avisan si no cargan.
        if (guardada.rol === 'estudiante') setPantalla({ tipo: 'diagnosticoInicio', apodo: guardada.nombre, avatar: guardada.avatar });
        else salir(); // el panel del adulto necesita conexión
      }
    })();
  }, [salir]);

  async function iniciarSesionEstudiante(token: string, estudiante: Estudiante) {
    setToken(token);
    await guardarSesion({ token, rol: 'estudiante', nombre: estudiante.apodo, avatar: estudiante.avatar });
    setPantalla({ tipo: 'diagnosticoInicio', apodo: estudiante.apodo, avatar: estudiante.avatar });
  }

  async function iniciarSesionAdulto(token: string, usuario: Usuario) {
    setToken(token);
    await guardarSesion({ token, rol: usuario.rol, nombre: usuario.nombre });
    setPantalla({ tipo: 'panelAdulto', usuario });
  }

  let contenido;
  switch (pantalla.tipo) {
    case 'cargando':
      contenido = (
        <View style={styles.cargando}>
          <ActivityIndicator size="large" color={colors.cordillera} accessibilityLabel="Cargando" />
        </View>
      );
      break;
    case 'bienvenida':
      contenido = (
        <Bienvenida
          onEstudiante={() => setPantalla({ tipo: 'loginEstudiante' })}
          onAdulto={() => setPantalla({ tipo: 'loginAdulto' })}
        />
      );
      break;
    case 'loginEstudiante':
      contenido = <LoginEstudiante onEntrar={iniciarSesionEstudiante} onVolver={salir} />;
      break;
    case 'loginAdulto':
      contenido = (
        <LoginAdulto
          aviso={pantalla.aviso}
          onEntrar={iniciarSesionAdulto}
          onRegistrarse={() => setPantalla({ tipo: 'registro' })}
          onOlvideClave={(email) => setPantalla({ tipo: 'recuperar', email })}
          onVolver={salir}
        />
      );
      break;
    case 'registro':
      contenido = <Registro onRegistrado={iniciarSesionAdulto} onVolver={() => setPantalla({ tipo: 'loginAdulto' })} />;
      break;
    case 'recuperar':
      contenido = (
        <RecuperarClave
          emailInicial={pantalla.email}
          onListo={() => setPantalla({ tipo: 'loginAdulto', aviso: 'Contraseña actualizada. Ya puedes ingresar.' })}
          onVolver={() => setPantalla({ tipo: 'loginAdulto' })}
        />
      );
      break;
    case 'diagnosticoInicio':
      contenido=<DiagnosticoInicio onContinuar={()=>setPantalla({tipo:'camino',apodo:pantalla.apodo,avatar:pantalla.avatar})}
        onRendir={id=>setPantalla({tipo:'evaluacion',evaluacionId:id,apodo:pantalla.apodo,avatar:pantalla.avatar,diagnostico:true})}
        onSalir={salir}/>;
      break;
    case 'camino':
      // CU10 — progresión lineal Kumon (reemplaza al mapa de islas tras la 2.ª revisión del cliente)
      contenido = (
        <MiCamino apodo={pantalla.apodo} avatar={pantalla.avatar}
          onHacerTanda={(conjuntoId) => setPantalla({ tipo: 'tanda', apodo: pantalla.apodo, avatar: pantalla.avatar, conjuntoId })}
          onEvaluaciones={() => setPantalla({ tipo: 'evaluacionesEstudiante', apodo: pantalla.apodo, avatar: pantalla.avatar })}
          onVideollamadas={() => setPantalla({ tipo: 'videollamadasEstudiante', apodo: pantalla.apodo, avatar: pantalla.avatar })}
          onCerrarSesion={() => void salir()} />
      );
      break;
    case 'evaluacionesEstudiante':
      contenido = <Evaluaciones onVolver={() => setPantalla({ tipo: 'camino', apodo: pantalla.apodo, avatar: pantalla.avatar })}
        onAbrir={(evaluacionId) => setPantalla({ tipo: 'evaluacion', evaluacionId, apodo: pantalla.apodo, avatar: pantalla.avatar })} />;
      break;
    case 'evaluacion':
      contenido = <RendirEvaluacion evaluacionId={pantalla.evaluacionId}
        onVolver={() => setPantalla({ tipo: pantalla.diagnostico?'diagnosticoInicio':'evaluacionesEstudiante', apodo: pantalla.apodo, avatar: pantalla.avatar })} />;
      break;
    case 'tanda':
      contenido = <Tanda conjuntoId={pantalla.conjuntoId} onVolver={() => setPantalla({ tipo: 'camino', apodo: pantalla.apodo, avatar: pantalla.avatar })} />;
      break;
    case 'videollamadasEstudiante': {
      const { apodo, avatar } = pantalla;
      contenido = <Videollamadas rol="estudiante" onVolver={() => setPantalla({ tipo: 'camino', apodo, avatar })} />;
      break;
    }
    case 'videollamadas': {
      const { usuario } = pantalla;
      contenido = <Videollamadas rol="docente" onVolver={() => setPantalla({ tipo: 'panelAdulto', usuario })} />;
      break;
    }
    case 'revisiones': {
      const { usuario } = pantalla;
      contenido = <RevisionesUnidad onVolver={() => setPantalla({ tipo: 'panelAdulto', usuario })} />;
      break;
    }
    case 'panelAdulto':
      contenido = (
        <PanelAdulto
          usuario={pantalla.usuario}
          onIr={(destino) =>
            destino === 'progreso' ? setProgresoAbierto(true) : setPantalla(destino === 'consentimiento'
              ? { tipo: 'consentimiento', usuario: pantalla.usuario, volverA: 'panel' }
              : { tipo: destino, usuario: pantalla.usuario })}
          onSalir={salir}
        />
      );
      break;
    case 'consentimiento': {
      const { usuario, volverA } = pantalla;
      contenido = (
        <Consentimiento
          onVolver={() => setPantalla(volverA === 'estudiantes' ? { tipo: 'estudiantes', usuario } : { tipo: 'panelAdulto', usuario })}
          onAceptado={() => setPantalla({ tipo: 'estudiantes', usuario })}
        />
      );
      break;
    }
    case 'estudiantes': {
      const { usuario } = pantalla;
      contenido = (
        <MisEstudiantes
          onIrAConsentimiento={() => setPantalla({ tipo: 'consentimiento', usuario, volverA: 'estudiantes' })}
          onVolver={() => setPantalla({ tipo: 'panelAdulto', usuario })}
        />
      );
      break;
    }
    case 'cursos': {
      const { usuario } = pantalla;
      contenido = <MisCursos onVolver={() => setPantalla({ tipo: 'panelAdulto', usuario })} />;
      break;
    }
    case 'secuencia': {
      const { usuario } = pantalla;
      contenido = <SecuenciaKumon onVolver={() => setPantalla({ tipo: 'panelAdulto', usuario })} />;
      break;
    }
    case 'banco': {
      const { usuario } = pantalla;
      contenido = <BancoPreguntas onVolver={() => setPantalla({ tipo: 'panelAdulto', usuario })} />;
      break;
    }
    case 'perfil': {
      const actual = pantalla.usuario;
      contenido = (
        <Perfil
          onActualizado={async (usuario) => {
            setPantalla({ tipo: 'perfil', usuario });
            const guardada = await leerSesion();
            if (guardada) await guardarSesion({ ...guardada, nombre: usuario.nombre });
          }}
          onVolver={() => setPantalla({ tipo: 'panelAdulto', usuario: actual })}
        />
      );
      break;
    }
  }

  const rolSesion = ('usuario' in pantalla) ? pantalla.usuario.rol : 'estudiante';
  const autenticado = !['cargando','bienvenida','loginEstudiante','loginAdulto','registro','recuperar'].includes(pantalla.tipo);
  const tipoActividad = pantalla.tipo==='tanda'?'leccion':pantalla.tipo==='evaluacion'?'examen':undefined;
  const salirActividad=()=>{
    if(pantalla.tipo==='tanda'){
      setPantalla({tipo:'camino',apodo:pantalla.apodo,avatar:pantalla.avatar});
    } else if(pantalla.tipo==='evaluacion'){
      setPantalla({tipo:pantalla.diagnostico?'diagnosticoInicio':'evaluacionesEstudiante',apodo:pantalla.apodo,avatar:pantalla.avatar});
    }
  };
  function cerrarAvisos(){setAvisosAbiertos(false);setActualizacionAvisos(x=>x+1);}
  return (
    <SafeAreaProvider>
      <View style={styles.raiz}>
        {autenticado?<CabeceraSesion onAbrirAvisos={()=>setAvisosAbiertos(true)}
          onAbrirProgreso={()=>setProgresoAbierto(true)} onCerrarSesion={()=>void salir()}
          actualizar={actualizacionAvisos} tipoActividad={tipoActividad}
          onSalirActividad={tipoActividad?salirActividad:undefined}/>:null}
        {contenido}
        <Modal visible={autenticado&&avisosAbiertos} animationType="slide" onRequestClose={cerrarAvisos}>
          <SafeAreaView edges={['top','bottom']} style={styles.raiz}>
            <Notificaciones onVolver={cerrarAvisos}/>
          </SafeAreaView>
        </Modal>
        <Modal visible={autenticado&&progresoAbierto} animationType="slide" onRequestClose={()=>setProgresoAbierto(false)}>
          <ProgresoV14 rol={rolSesion} onVolver={()=>setProgresoAbierto(false)}/>
        </Modal>
      </View>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.cielo },
  cargando: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cielo },
});
