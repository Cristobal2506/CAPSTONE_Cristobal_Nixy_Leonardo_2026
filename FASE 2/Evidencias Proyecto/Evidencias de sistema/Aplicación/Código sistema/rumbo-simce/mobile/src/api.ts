// Cliente HTTP de la API de Rumbo SIMCE.
// En un teléfono físico "localhost" no apunta a tu PC: define EXPO_PUBLIC_API_URL
// con la IP de tu computador en la red local, ej: http://192.168.100.2:3000/api (IP real del PC)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export type Rol = 'estudiante' | 'apoderado' | 'docente' | 'admin';
export type RolAdulto = Exclude<Rol, 'estudiante'>;

export interface Eje {
  id: number;
  codigo: string;
  nombre: string;
  isla_nombre: string;
  orden: number;
}

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: RolAdulto;
}

export interface Estudiante {
  id: number;
  apodo: string;
  avatar: string;
  curso_id?: number | null;
}

// CU03
export interface Consentimiento {
  id: number;
  version_texto: string;
  otorgado_en: string;
}
export interface TextoConsentimiento {
  version: string;
  borrador: boolean;
  titulo: string;
  secciones: { titulo: string; puntos: string[] }[];
}

// CU04 / CU06 — estudiante visto por su apoderado
export interface EstudianteDeApoderado {
  id: number;
  apodo: string;
  avatar: string;
  codigo_acceso: string;
  curso_id: number | null;
  curso: string | null;
}

// CU05
export interface Curso {
  id: number;
  nombre: string;
  establecimiento: string | null;
  anio: number;
  codigo_union: string;
  estudiantes?: number;
}

// CU09
export interface OpcionJuego { clave: string; texto: string }
export interface PreguntaJuego { id: number; enunciado: string; opciones: OpcionJuego[] }
export interface Mision {
  id: number;
  eje: { id: number; codigo: string; nombre: string; isla: string };
  total: number;
  preguntas: PreguntaJuego[];
}
export interface ResumenMision { total: number; respondidas: number; correctas: number; duracionSeg: number }
/** Estado completo de una misión (GET /misiones/:id y /misiones/abierta) — HU-12 */
export interface EstadoMision extends Mision {
  estado: 'abierta' | 'terminada' | 'abandonada';
  respondidas: { preguntaId: number; correcta: boolean }[];
  resumen: ResumenMision | null;
}

// CU11 — progreso por eje
export interface ProgresoEje {
  eje: { id: number; codigo: string; nombre: string; isla: string };
  misionesTerminadas: number;
  respondidas: number;
  correctas: number;
  porcentajeAcierto: number | null;
  aciertoReciente: number | null;
  nivel: number;
  ultimaMision: string | null;
}
export interface ResultadoRespuesta {
  correcta: boolean;
  respuestaCorrecta: string;
  explicacion: string;
  progreso: { respondidas: number; total: number };
  terminada: boolean;
  resumen: ResumenMision | null;
}

// CU08
export interface PreguntaBanco {
  id: number;
  codigo: string | null;
  ejeId: number;
  eje: string;
  enunciado: string;
  opciones: { clave: string; texto: string; tipoError: string | null }[];
  respuestaCorrecta: string;
  dificultad: number;
  estrategia: string;
  explicacion: string;
  activa: boolean;
  revisadaPedagogicamente: boolean;
  vecesRespondida: number;
  porcentajeAcierto: number | null;
}
/** Lo que se envía para crear o editar una pregunta (CU08). */
export interface PreguntaEntrada {
  ejeId: number;
  codigo?: string;
  enunciado: string;
  opciones: { clave: string; texto: string; tipoError?: string | null }[];
  respuestaCorrecta: string;
  dificultad: number;
  estrategia: string;
  explicacion: string;
}
export interface TipoError { codigo: string; descripcion: string; eje: string | null }

export interface ResumenEjeBanco {
  id: number;
  codigo: string;
  nombre: string;
  isla: string;
  activas: number;
  inactivas: number;
  revisadas: number;
  porDificultad: Record<string, number>;
}

// ═════════ Motor Kumon (2.ª revisión del cliente) ═════════
export type EstadoConjunto = 'dominado' | 'actual' | 'bloqueado' | 'omitido';
export interface ConjuntoCamino {
  id: number; codigo: string; titulo: string; objetivoAprendizaje: string; tiempoEstandarSeg: number;
  estado: EstadoConjunto; intentos: number; mejorTiempoSeg: number | null;
  yaDominado?: boolean; // v16.1: la lección actual ya se dominó antes (el alumno retrocedió a ella)
}
export interface NivelCamino { id: number; codigo: string; nombre: string; estado: EstadoConjunto; conjuntos: ConjuntoCamino[] }
export interface Camino {
  niveles: NivelCamino[]; conjuntoActualId: number; tandaAbiertaId: number | null;
  cierreNivelPendiente: boolean; requiereProfesor: boolean; ensayoDisponible?: boolean;
}
export interface HojaTanda {
  id: number; orden: number;
  ejemplo: { enunciado: string; resolucion: string };
  // v16.3: los ejercicios con respuesta numérica se escriben (opciones vacías); los demás, con alternativas.
  ejercicios: { id: number; enunciado: string; opciones: OpcionJuego[];
    formatoRespuesta?: FormatoRespuesta | 'alternativas'; prefijo?: string | null; sufijo?: string | null }[];
}
export type Decision = 'avanzar' | 'repetir' | 'retroceder' | 'repasar';
export interface ResultadoTanda {
  correctasPrimeraVuelta: number; total: number; tiempoSeg: number; tiempoEstandarSeg: number;
  rondas: number; cumpleEstandar: boolean; decision: Decision;
}
export interface Tanda {
  id: number; repeticion: number; ronda: number; iniciadoEn: string; total: number; tiempoEstandarSeg: number;
  terminado: boolean;
  conjunto: { codigo: string; titulo: string; objetivoAprendizaje: string; nivel: string };
  hojas: HojaTanda[];
  pendientes: number[];
  respuestas: { preguntaId: number; opcion: string | null; respuesta?: string | null }[];
  correctasAnteriores: number[];
  resultado: ResultadoTanda | null;
}
export type Revision =
  | { terminado: false; ronda: number; aCorregir: number[]; correctas: number[] }
  | { terminado: true; resultado: ResultadoTanda };
export interface ConjuntoAdmin {
  id: number; codigo: string; titulo: string; objetivoAprendizaje: string; tiempoEstandarSeg: number;
  activo: boolean; hojas: number; ejercicios: number; intentos: number; porcentajeCumpleEstandar: number | null;
}
export interface NivelAdmin { id: number; codigo: string; nombre: string; conjuntos: ConjuntoAdmin[] }
export interface DetalleConjunto {
  id: number; codigo: string; titulo: string; objetivoAprendizaje: string; tiempoEstandarSeg: number;
  hojas: { id: number; orden: number; ejemplo: { enunciado: string; resolucion: string };
    ejercicios: { id: number; codigo: string; enunciado: string; respuestaCorrecta: string }[] }[];
}

// CU20/CU22/CU23/CU24 — Videollamadas profesor-estudiante
export type MotivoVideo = 'diagnostico' | 'ayuda' | 'cierre_nivel';
export interface OpcionesVideo { diagnostico: boolean; ayuda: boolean; cierre_nivel: boolean }
export interface SolicitudVideo {
  id: number; estudianteId: number; estudiante: string; docente: string;
  motivo: MotivoVideo; estado: 'pendiente' | 'aceptada' | 'finalizada' | 'cancelada';
  creadoEn: string; aceptadaEn: string | null; finalizadaEn: string | null;
}

export type Perfil = { rol: 'estudiante'; estudiante: Estudiante } | { rol: RolAdulto; usuario: Usuario };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public reintentarEnMinutos?: number,
  ) {
    super(message);
  }
}

/** Error de red (sin internet, servidor apagado, IP mal configurada). */
export const esErrorDeRed = (e: unknown) => !(e instanceof ApiError);

let token: string | null = null;
let alExpirarSesion: (() => void) | null = null;

export const setToken = (t: string | null) => { token = t; };
/** La app registra aquí qué hacer si el token vence (volver a la bienvenida). */
export const onSesionExpirada = (fn: () => void) => { alExpirarSesion = fn; };

const TIEMPO_ESPERA_MS = 15000;

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIEMPO_ESPERA_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    if (res.status === 401 && err.code === 'TOKEN_INVALIDO' && token) alExpirarSesion?.();
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? 'Error del servidor', err.reintentarEnMinutos);
  }
  return data as T;
}

// v12: pruebas por unidad, revisión docente y ensayo integrador de 40 preguntas.
export interface Evaluacion {
  id: number; codigo: string; titulo: string; tipo: 'unidad' | 'final' | 'diagnostico';
  nivelId: number | null; tiempoLimiteSeg: number; umbral: number;
  habilitada: boolean; ultimo: ResultadoEvaluacion | null;
}
export interface ResultadoEvaluacion {
  id: number; evaluacionId: number; iniciadoEn: string; entregadoEn: string | null;
  correctas: number | null; total: number | null; porcentaje: number | null;
  aprobado: boolean | null; revisadoEn: string | null; autorizado: boolean | null;
  observacion: string | null; duracionSeg: number | null;
}
// v16: el diagnóstico y los facsímiles se responden escribiendo el número (dedo o lápiz).
export type FormatoRespuesta = 'entero' | 'decimal' | 'fraccion';
export interface PreguntaEvaluacion {
  id: number; orden: number; enunciado: string; oa: string;
  formatoRespuesta: FormatoRespuesta | 'alternativas';
  prefijo: string | null; sufijo: string | null;
  opciones: OpcionJuego[]; opcionElegida: string | null; respuestaTexto: string | null;
}
export interface CaracterLeido {
  tipo: 'digito' | 'separador'; valor: string; confianza: number;
  alternativas: { valor: string; confianza: number }[];
}
export interface LecturaNumero { texto: string; caracteres: CaracterLeido[]; confianza: number; dudoso: boolean }
export interface RespuestaEscritaEnvio { respuesta: string; trazos: [number, number][][][]; reconocido: string; confianza: number }
export interface PruebaActiva {
  evaluacion: Omit<Evaluacion, 'habilitada' | 'ultimo'>;
  intento: ResultadoEvaluacion;
  preguntas: PreguntaEvaluacion[];
}
export interface RevisionPendiente {
  id: number; estudiante: string; estudiante_id: number;
  titulo: string; codigo: string; correctas: number; total: number;
  porcentaje: number; entregado_en: string; duracion_seg: number;
  tipo: 'unidad' | 'final' | 'diagnostico'; aprobado: boolean;
}

// v15: detalle de una prueba entregada, solo para el docente del curso.
export interface DetalleEvaluacion {
  intento:{id:number;estudiante:string;titulo:string;tipo:'unidad'|'final'|'diagnostico';
    correctas:number;total:number;porcentaje:number;duracionSeg:number|null;respondidas:number};
  porUnidad:{unidad:number;nombre:string;correctas:number;total:number;porcentaje:number}[];
  porOA:{oa:string;descripcion:string|null;unidad:number|null;correctas:number;total:number;porcentaje:number}[];
  unidadSugerida:number|null; umbralSugerencia:number;
  preguntas:{orden:number;enunciado:string;oa:string|null;unidad:number|null;
    formatoRespuesta?:FormatoRespuesta|'alternativas';
    elegida:{clave:string|null;texto:string}|null;correcta:{clave:string|null;texto:string}|null;esCorrecta:boolean;
    escritura?:{trazos:[number,number][][][];reconocido:string|null;confianza:number|null;corregidaPorAlumno:boolean}|null}[];
}

// v14: reportes consolidados, con calificaciones solo después del dictamen docente.
export interface EstudianteProgreso { id:number;apodo:string;avatar:string }
export interface ReporteProgreso {
  estudiante:EstudianteProgreso;
  resumen:{totalLecciones:number;aprobadas:number;omitidas:number;pruebasRendidas:number;pruebasRevisadas:number};
  unidades:{id:number;nombre:string;orden:number;lecciones:{id:number;codigo:string;titulo:string;
    estado:'aprobada'|'omitida'|'actual'|'pendiente';intentos:number;mejorTiempoSeg:number|null}[]}[];
  evaluaciones:{id:number;titulo:string;tipo:string;codigo:string;entregadoEn:string;revisadoEn:string|null;
    correctas:number|null;total:number|null;porcentaje:number|null;duracionSeg:number|null;
    autorizado:boolean|null;observacion:string|null}[];
}

export const api = {
  // CU01
  loginEstudiante: (codigo: string, pin: string) =>
    request<{ token: string; estudiante: Estudiante }>('/auth/login-estudiante', { method: 'POST', body: { codigo, pin } }),
  loginAdulto: (email: string, password: string) =>
    request<{ token: string; usuario: Usuario }>('/auth/login', { method: 'POST', body: { email, password } }),
  // CU02
  registro: (datos: { nombre: string; email: string; password: string; rol: 'apoderado' | 'docente' }) =>
    request<{ token: string; usuario: Usuario }>('/auth/registro', { method: 'POST', body: datos }),
  // CU07
  recuperar: (email: string) =>
    request<{ mensaje: string }>('/auth/recuperar', { method: 'POST', body: { email } }),
  restablecer: (email: string, codigo: string, password: string) =>
    request<{ mensaje: string }>('/auth/restablecer', { method: 'POST', body: { email, codigo, password } }),
  // HU-05 / HU-06
  me: () => request<Perfil>('/me'),
  editarNombre: (nombre: string) => request<{ usuario: Usuario }>('/me', { method: 'PATCH', body: { nombre } }),
  cambiarPassword: (actual: string, nueva: string) =>
    request<{ mensaje: string }>('/me/password', { method: 'POST', body: { actual, nueva } }),
  // Mapa
  ejes: () => request<{ ejes: Eje[] }>('/ejes'),

  // CU03 — consentimiento (apoderado)
  consentimiento: () =>
    request<{ versionVigente: string; consentimiento: Consentimiento | null }>('/apoderado/consentimiento'),
  textoConsentimiento: () => request<TextoConsentimiento>('/apoderado/consentimiento/texto'),
  aceptarConsentimiento: () =>
    request<{ consentimiento: Consentimiento }>('/apoderado/consentimiento', { method: 'POST', body: { acepta: true } }),
  revocarConsentimiento: () => request<null>('/apoderado/consentimiento', { method: 'DELETE' }),

  // CU04 / CU06 — estudiantes del apoderado
  misEstudiantes: () => request<{ estudiantes: EstudianteDeApoderado[] }>('/apoderado/estudiantes'),
  crearEstudiante: (datos: { apodo: string; avatar: string; pin: string }) =>
    request<{ estudiante: { id: number; apodo: string; avatar: string; codigo_acceso: string } }>(
      '/apoderado/estudiantes', { method: 'POST', body: datos }),
  inscribirEnCurso: (estudianteId: number, codigoCurso: string) =>
    request<{ curso: { id: number; nombre: string } }>(
      `/apoderado/estudiantes/${estudianteId}/curso`, { method: 'POST', body: { codigoCurso } }),

  // CU05 — cursos del docente
  misCursos: () => request<{ cursos: Curso[] }>('/docente/cursos'),
  crearCurso: (datos: { nombre: string; establecimiento?: string }) =>
    request<{ curso: Curso }>('/docente/cursos', { method: 'POST', body: datos }),
  estudiantesDeCurso: (cursoId: number) =>
    request<{ estudiantes: { id: number; apodo: string; avatar: string }[] }>(`/docente/cursos/${cursoId}/estudiantes`),

  // CU09 — misiones (estudiante)
  iniciarMision: (ejeId: number) => request<{ mision: Mision }>('/estudiante/misiones', { method: 'POST', body: { ejeId } }),
  responder: (misionId: number, datos: { preguntaId: number; opcion: string; tiempoMs: number }) =>
    request<ResultadoRespuesta>(`/estudiante/misiones/${misionId}/respuestas`, { method: 'POST', body: datos }),
  // HU-12
  misionAbierta: (ejeId: number) => request<{ mision: EstadoMision | null }>(`/estudiante/misiones/abierta?ejeId=${ejeId}`),
  abandonarMision: (misionId: number) => request<null>(`/estudiante/misiones/${misionId}/abandonar`, { method: 'POST' }),
  // CU11
  progreso: () => request<{ ejes: ProgresoEje[] }>('/estudiante/progreso'),

  // Kumon — estudiante (CU09 / CU10 / CU11 / CU12 / CU13)
  camino: () => request<Camino>('/estudiante/camino'),
  evaluaciones: () => request<{ evaluaciones: Evaluacion[] }>('/evaluaciones'),
  estadoDiagnostico: () => request<{estado:'pendiente'|'en_curso'|'en_revision'|'exento'|'asignado';unidadInicial:number|null}>('/evaluaciones/diagnostico/estado'),
  diagnostico: () => request<{id:number,titulo:string}>('/evaluaciones/diagnostico'),
  notificaciones: () => request<{notificaciones:{id:number,titulo:string,mensaje:string,leida:boolean,creada_en:string}[],noLeidas:number}>('/notificaciones'),
  leerTodasNotificaciones: () => request<{marcadas:number;noLeidas:number}>('/notificaciones/leer-todas',{method:'POST'}),
  miProgresoV14: () => request<ReporteProgreso>('/progreso/mio'),
  estudiantesProgresoV14: () => request<{estudiantes:EstudianteProgreso[]}>('/progreso/estudiantes'),
  reporteEstudianteV14: (id:number) => request<ReporteProgreso>(`/progreso/estudiantes/${id}`),
  leerNotificacion: (id:number) => request<{leida:boolean}>(`/notificaciones/${id}/leer`,{method:'POST'}),
  iniciarEvaluacion: (id: number) => request<PruebaActiva>(`/evaluaciones/${id}/iniciar`, { method: 'POST' }),
  obtenerEvaluacion: (id: number) => request<PruebaActiva>(`/evaluaciones/intentos/${id}`),
  responderEvaluacion: (id: number, preguntaId: number, opcion: string) => request<{guardada:boolean}>(`/evaluaciones/intentos/${id}/respuesta`, { method: 'PUT', body: { preguntaId, opcion } }),
  // v16: respuesta escrita ya confirmada por el alumno (se guardan también los trazos para el docente).
  responderEvaluacionEscrita: (id: number, preguntaId: number, datos: RespuestaEscritaEnvio) =>
    request<{guardada:boolean;respuesta:string}>(`/evaluaciones/intentos/${id}/respuesta`, { method: 'PUT', body: { preguntaId, ...datos } }),
  // v16: lee un número escrito a mano. No guarda nada.
  reconocerNumero: (trazos: [number, number][][], formato: 'entero' | 'decimal') =>
    request<{lectura:LecturaNumero}>('/reconocimiento/numero', { method: 'POST',
      body: { trazos: trazos.map((t) => t.map(([x, y]) => [Math.round(x), Math.round(y)])), formato } }),
  entregarEvaluacion: (id: number) => request<{resultado:ResultadoEvaluacion}>(`/evaluaciones/intentos/${id}/entregar`, { method: 'POST' }),
  revisionesPendientes: () => request<{pendientes:RevisionPendiente[]}>('/docente/evaluaciones/pendientes'),
  detalleEvaluacion: (id: number) => request<DetalleEvaluacion>(`/docente/evaluaciones/${id}/detalle`),
  revisarEvaluacion: (id: number, autorizar: boolean, observacion: string, unidadInicial?:number) => request<{revision:{id:number;autorizado:boolean}}>(`/docente/evaluaciones/${id}/revisar`, { method: 'POST', body: { autorizar, observacion, unidadInicial } }),
  iniciarTanda: (conjuntoId?:number) => request<{ tanda: Tanda; retomada: boolean }>('/estudiante/tandas', { method: 'POST', body: conjuntoId ? {conjuntoId} : {} }),
  responderTanda: (tandaId: number, preguntaId: number, opcion: string) =>
    request<{ ronda: number; respondidas: number; porResponder: number }>(
      `/estudiante/tandas/${tandaId}/respuestas`, { method: 'POST', body: { preguntaId, opcion } }),
  // v16.3: número escrito y ya confirmado por el alumno.
  responderTandaEscrita: (tandaId: number, preguntaId: number, datos: RespuestaEscritaEnvio) =>
    request<{ ronda: number; respondidas: number; porResponder: number; respuesta: string }>(
      `/estudiante/tandas/${tandaId}/respuestas`, { method: 'POST', body: { preguntaId, ...datos } }),
  revisarTanda: (tandaId: number) => request<Revision>(`/estudiante/tandas/${tandaId}/revisar`, { method: 'POST' }),

  // Kumon — administrador (CU18)
  secuencia: () => request<{ niveles: NivelAdmin[] }>('/admin/secuencia'),
  conjuntoAdmin: (id: number) => request<{ conjunto: DetalleConjunto }>(`/admin/conjuntos/${id}`),
  editarConjunto: (id: number, cambios: { tiempoEstandarSeg?: number; titulo?: string; objetivoAprendizaje?: string }) =>
    request<{ conjunto: ConjuntoAdmin }>(`/admin/conjuntos/${id}`, { method: 'PATCH', body: cambios }),

  // Videoconferencias privadas. Nunca se devuelve la API key ni el token de otro participante.
  opcionesVideo: () => request<{ opciones: OpcionesVideo }>('/videollamadas/opciones'),
  videollamadas: () => request<{ solicitudes: SolicitudVideo[] }>('/videollamadas'),
  solicitarVideo: (motivo: MotivoVideo) => request<{ solicitud: SolicitudVideo }>('/videollamadas', { method: 'POST', body: { motivo } }),
  aceptarVideo: (id: number) => request<{ solicitud: SolicitudVideo }>(`/videollamadas/${id}/aceptar`, { method: 'POST' }),
  accesoVideo: (id: number) => request<{ url: string; token: string; sala: string; proveedor: 'livekit' }>(`/videollamadas/${id}/acceso`),
  cancelarVideo: (id: number) => request<{ solicitud: SolicitudVideo }>(`/videollamadas/${id}/cancelar`, { method: 'POST' }),
  finalizarVideo: (id: number) => request<{ solicitud: SolicitudVideo }>(`/videollamadas/${id}/finalizar`, { method: 'POST' }),

  // CU08 — banco de preguntas (administrador)
  resumenBanco: () => request<{ ejes: ResumenEjeBanco[] }>('/admin/preguntas/resumen'),
  preguntasDeEje: (ejeCodigo: string) =>
    request<{ preguntas: PreguntaBanco[] }>(`/admin/preguntas?eje=${encodeURIComponent(ejeCodigo)}`),
  editarPregunta: (id: number, cambios: Partial<PreguntaEntrada & Pick<PreguntaBanco, 'activa' | 'revisadaPedagogicamente'>>) =>
    request<{ pregunta: PreguntaBanco }>(`/admin/preguntas/${id}`, { method: 'PATCH', body: cambios }),
  crearPregunta: (p: PreguntaEntrada) => request<{ pregunta: PreguntaBanco }>('/admin/preguntas', { method: 'POST', body: p }),
  tiposError: () => request<{ tiposError: TipoError[] }>('/admin/tipos-error'),
};
