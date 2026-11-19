# Rumbo SIMCE v14 — Historial técnico y criterios de aceptación

## Alcance implementado

1. **CU nuevos: consulta de progreso del estudiante y consulta autorizada por adulto vinculado.** GET `/api/progreso/mio`, `/api/progreso/estudiantes`, `/api/progreso/estudiantes/:id`. El API autentica y controla el rol; no entrega notas no revisadas. El progreso se infiere de `intento`, `estudiante_posicion` y `unidad_omitida_diagnostico`; la historia de pruebas se consulta en `evaluacion_intento`.
2. **Notificaciones:** POST `/api/notificaciones/leer-todas` marca como leídos los avisos de la cuenta autenticada. Abrir la bandeja limpia la insignia visual, sin borrar la notificación.
3. **Cabecera:** tres controles principales con iconos ↗, 🔔 y × (progreso, avisos y cerrar sesión), con confirmación de salida. Durante actividades también se conserva ⚙ para salir guardando las respuestas.
4. **Camino:** tres accesos compactos alineados horizontalmente al pie, con área segura inferior y etiquetas cortas.
5. **Contenido curricular:** se agregaron `U1-C04..U5-C08` según la unidad: 15 nuevos `conjunto`, 30 `hoja`, 150 `pregunta` y 150 vínculos en `hoja_ejercicio`. Banco fuente editable `backend/scripts/banco-practica-v14.json`. Generador opcional `backend/scripts/generar-banco-v14.py`. El seed `008_ampliacion_practicas_v14.sql` es idempotente. Se conservan diagnóstico, 5 pruebas de unidad y ensayo original.

## Tratamiento de datos existentes

- Antes de migrar una base usada, efectuar un respaldo. Ejecutar `npm run db:seed`, **nunca `db:reset` sobre una base a conservar**.
- Se conservarán intentos y respuestas históricos. Para alumnos que estaban en el cierre de una unidad y aún no han rendido su prueba, el seed mueve su posición a la primera lección nueva, haciendo que completen las actividades añadidas.
- **Las pruebas ya entregadas/revisadas no se alteran**. Esto significa que antiguos aprobados podrán haber completado menos lecciones que los alumnos nuevos: es una decisión explícita de compatibilidad histórica.
- El cálculo de progreso incluye lecciones omitidas por diagnóstico en la barra, distinguiéndolas de las aprobadas.

## Contratos funcionales nuevos

- Alumno: ↗ abre su propio reporte; visualiza lecciones aprobadas, en curso, bloqueadas u omitidas y resultados de pruebas revisadas.
- Docente: ↗ abre listado de estudiantes de sus cursos y permite consultar progreso de cada uno.
- Apoderado: ↗ abre únicamente estudiantes vinculados por `apoderado_estudiante`.
- Cualquier cuenta ajena a la relación debe recibir 404/403, nunca los datos de un menor.
- Evaluación sin `revisado_en`: se muestra “En revisión” y **no** se devuelve `correctas`, `total`, `porcentaje` ni `duracionSeg`.
- Abrir campanita: se limpia el contador con POST, pero no se borra el registro ni sus mensajes.

## Herramientas y verificaciones

- `cd backend && npm run verificar:v14`: banco, semillas, rutas y reglas de privacidad (offline).
- `cd mobile && npm run verificar:v14`: cabecera, API, Camino y progreso (offline).
- `cd backend && npm run test:v14`: integración sobre PostgreSQL aislado (requiere instalación local y base configurada).
- `cd mobile && npm run typecheck`: comprobación de tipos después de instalar npm.
- `cd mobile && npm run prebuild:android`: genera Android con JDK21; compilar APK en Android Studio o `gradlew assembleDebug`.

**Verificación pendiente:** el entorno donde se preparó v14 no permite compilar Android ni levantar PostgreSQL. El resultado de una instalación real deberá registrarse por el equipo. No se debe marcar la versión como aprobada en dispositivos antes de efectuar esa prueba.
