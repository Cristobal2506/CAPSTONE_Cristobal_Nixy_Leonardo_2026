require('dotenv').config({ quiet: true });

const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://rumbo:rumbo@localhost:5433/rumbo_simce',
  jwtSecret: process.env.JWT_SECRET || 'solo-para-desarrollo-cambiar',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  // Versión vigente del texto de consentimiento que acepta el apoderado (RF12)
  consentimientoVersion: process.env.CONSENTIMIENTO_VERSION || 'v1-2026',
  env: process.env.NODE_ENV || 'development',

  // HU-04: bloqueo temporal tras intentos fallidos de inicio de sesión
  maxIntentosLogin: Number(process.env.MAX_INTENTOS_LOGIN || 5),
  bloqueoMinutos: Number(process.env.BLOQUEO_MINUTOS || 15),

  // CU07: recuperación de contraseña
  recuperacion: {
    vigenciaMinutos: 30,
    maxIntentosCodigo: 5, // intentos para escribir el código antes de que se anule
    maxSolicitudes: 3, // solicitudes por usuario cada 15 minutos (evita llenar el correo de alguien)
  },

  // CU09: misiones. 6 preguntas ≈ 5–8 minutos para un niño de 4° básico (HU-11); se ajusta tras la prueba con usuarios.
  mision: {
    preguntas: Number(process.env.PREGUNTAS_POR_MISION || 6),
    // HU-12: una misión a medias se ofrece para retomar durante este plazo; después se parte de cero.
    horasParaRetomar: Number(process.env.HORAS_PARA_RETOMAR_MISION || 24),
    // En producción solo se sirven preguntas validadas por el equipo pedagógico de Triskel Edu.
    soloRevisadas: (process.env.MISION_SOLO_REVISADAS ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true',
  },

  // Motor de progresión individualizada: estándares ajustables por docente.
  kumon: {
    // Dominar un conjunto = acierto en la primera vuelta ≥ umbral (1 = todo correcto) y tiempo ≤ tiempo estándar.
    umbralAcierto: Number(process.env.KUMON_UMBRAL_ACIERTO || 1),
    // Si el acierto de la primera vuelta queda bajo este umbral, se retrocede al conjunto anterior.
    umbralRetroceso: Number(process.env.KUMON_UMBRAL_RETROCESO || 0.5),
    // Intentos seguidos sin alcanzar el estándar que marcan «requiere profesor» (base de CU22).
    maxIntentosSinEstandar: Number(process.env.KUMON_MAX_INTENTOS_SIN_ESTANDAR || 3),
    // Al terminar el último conjunto de un nivel, el paso al siguiente lo autoriza el profesor (CU24).
    cierreNivelConProfesor: (process.env.KUMON_CIERRE_NIVEL_CON_PROFESOR ?? 'true') === 'true',
    // v16.3: segundos que se suman al tiempo estándar por cada ejercicio que se responde escribiendo
    // (escribir el número y confirmar la lectura toma más que tocar una alternativa).
    segundosExtraEscritura: Number(process.env.KUMON_SEGUNDOS_EXTRA_ESCRITURA ?? 10),
  },

  // Correo saliente. Sin SMTP_HOST los correos se muestran en la consola de la API (desarrollo).
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Rumbo SIMCE <no-responder@rumbosimce.cl>',
  },
};

if (config.env === 'production' && config.jwtSecret === 'solo-para-desarrollo-cambiar') {
  throw new Error('JWT_SECRET debe definirse en producción');
}
if (config.env === 'production' && !config.mail.host) {
  throw new Error('SMTP_HOST debe definirse en producción (envío de correos de recuperación)');
}

module.exports = config;
