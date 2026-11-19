# Rumbo SIMCE v13.1 — Registro de cambios

La v13.1 modifica solo tres áreas funcionales: diagnóstico, notificaciones y salida de actividades. **Se conserva LiveKit** y el resto del motor educativo de v13.

## Diagnóstico renovado

- 40 preguntas nuevas originales: ocho de cada una de las cinco unidades y 40 planteamientos diferentes, en lugar de un mismo tipo de problema repetido con otras cifras.
- 14 OA matemáticos presentes en el temario proporcionado. Matriz explicativa: `docs/matriz-diagnostico-v131.md`.
- Nueva evaluación `DIAG-INICIAL-V131`, con 60 minutos, de una sola oportunidad por alumno.
- Evaluación anterior `DIAG-INICIAL` desactivada para nuevas inscripciones, pero sus preguntas, intentos y respuestas permanecen. Un alumno que la inició puede terminar su intento sin cambiar el cuestionario.
- El docente sigue asignando unidad inicial y escribiendo comentarios; la nota no se comunica antes de la revisión.

## Notificaciones

- Se añadió `CabeceraSesion.tsx`, visible para todas las sesiones autenticadas, con 🔔, contador de avisos sin leer y recarga interna cada 15 segundos.
- El acceso a las notificaciones se movió desde los botones inferiores a la campanita superior.
- Se creó soporte de notificaciones para **apoderados** en `012_avisos_apoderado_v131.sql`. Una revisión de evaluación envía aviso también a los apoderados vinculados; las cuentas tienen acceso solo a sus propios avisos.
- No se añadió servicio push de Android, Firebase ni notificaciones cuando la app está cerrada.

## Ajustes en actividades

- La opción de salir se retiró del pie de pantalla de la tanda y del examen.
- Durante esas actividades, la cabecera muestra **⚙ Ajustes** con diálogo de confirmación y explicación sobre guardado de respuestas.
- Al abandonar un examen, las respuestas enviadas siguen guardadas y el tiempo de examen continúa.

## Operación y distribución

- `backend/migrations/011_diagnostico_v131.sql`: evaluación nueva y versionado.
- `backend/migrations/012_avisos_apoderado_v131.sql`: nueva columna con destinatario apoderado.
- `backend/seeds/007_diagnostico_unico_v131.sql`: banco revisado, idempotente.
- `npm run db:seed`: opción para conservar alumnos e intentos; `db:reset` destruye la base de desarrollo configurada.
- `npm run verificar:v13.1` tanto en `backend` como en `mobile` sin instalar dependencias, aunque la prueba integral requiere PostgreSQL y Android.
- `npm test` en backend ejecuta las pruebas acumuladas; usa una **base de pruebas exclusiva** que el setup reinicia.
- `react-native-safe-area-context` fijado en `~5.7.0` tras aviso de compatibilidad de Expo SDK 57.
- Compilación en Windows: ruta corta, p. ej. `C:\Rumbo\v131\rumbo-simce`; Java/Gradle daemon JDK 21.

## Verificación

Se comprobaron la integridad de los 40 nuevos enunciados, alternativas, cobertura OA y enlaces del banco, la sintaxis de los archivos JavaScript y el análisis sintáctico TypeScript. **No se ejecutó compilación Android ni pruebas PostgreSQL completas en este entorno**; la validación con dos teléfonos queda a cargo del equipo.
