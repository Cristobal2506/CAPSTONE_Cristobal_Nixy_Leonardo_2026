// CU03 / HU-29 — Texto del consentimiento que lee el apoderado antes de aceptar.
// Se versiona: el consentimiento registrado guarda la versión que se aceptó (RF12).
// Para publicar un texto nuevo: agregar una versión aquí y cambiar CONSENTIMIENTO_VERSION en .env.
//
// ⚠ BORRADOR del equipo de desarrollo. El texto definitivo lo debe entregar o validar Triskel Edu
//   (responsable de los datos). Los puntos marcados «por confirmar» dependen de esa validación.

const db = require('../db');
const { forbidden } = require('./errors');

const TEXTOS = {
  'v1-2026': {
    borrador: true,
    titulo: 'Permiso para usar los datos de tu hijo o hija en Rumbo SIMCE',
    secciones: [
      {
        titulo: 'Qué datos recogemos',
        puntos: [
          'De ti: tu nombre y tu correo, para tu cuenta y para recuperar la contraseña.',
          'De tu hijo o hija: solo un apodo, el avatar que elija y el curso al que lo inscribas.',
          'Mientras juega: sus respuestas, el tiempo que tarda en cada pregunta, su avance por eje y los errores que se repiten.',
          'No pedimos RUT, correo, fotos, ubicación ni datos de contacto del niño o niña.',
        ],
      },
      {
        titulo: 'Para qué los usamos',
        puntos: [
          'Ajustar las preguntas a su nivel y explicarle de otra forma cuando algo le cuesta.',
          'Mostrarte su avance y avisarte cuando una dificultad se repite.',
          'Mostrar al docente del curso el avance del grupo. El docente ve el apodo, nunca el código ni el PIN.',
          'No vendemos los datos ni los usamos para publicidad.',
        ],
      },
      {
        titulo: 'Cuánto tiempo los guardamos',
        puntos: [
          'Mientras la cuenta esté activa y el permiso vigente.',
          'Si retiras el permiso, se detiene el registro de nuevos datos y se inicia la eliminación de los existentes (plazo por confirmar con Triskel Edu).',
        ],
      },
      {
        titulo: 'Tus derechos',
        puntos: [
          'Puedes pedir ver, corregir o eliminar los datos, y retirar este permiso cuando quieras desde la aplicación.',
          'Responsable de los datos: Triskel Edu (datos de contacto por confirmar).',
        ],
      },
    ],
  },
};

/**
 * RF12 / Ley 21.719: sin consentimiento vigente de al menos un apoderado vinculado no se registran
 * datos de práctica del estudiante (misiones, tandas Kumon).
 */
async function exigirConsentimiento(estudianteId) {
  const { rowCount } = await db.query(
    `SELECT 1 FROM apoderado_estudiante ae
     JOIN consentimiento c ON c.apoderado_id = ae.apoderado_id AND c.revocado_en IS NULL
     WHERE ae.estudiante_id = $1 LIMIT 1`,
    [estudianteId],
  );
  if (!rowCount) {
    throw forbidden('Para jugar, tu apoderado tiene que aceptar el permiso en su cuenta.', 'SIN_CONSENTIMIENTO');
  }
}

function textoConsentimiento(version) {
  return TEXTOS[version] ?? null;
}

module.exports = { textoConsentimiento, exigirConsentimiento };
