# Rumbo SIMCE v15 — Cambios para el video de demostración

**Fecha:** 31 de octubre de 2026 · **Base:** v14 · **Tipo de cambio:** solo JavaScript y base de datos (no hay cambios nativos: **no hace falta recompilar la APK**).

## Qué cambió

1. **Cerrar sesión visible para el alumno.** «Mi camino» tiene un botón rojo «Cerrar sesión» junto al saludo, con confirmación. Antes la única salida era la X de la cabecera, que no se reconocía como «salir». La X sigue disponible.
2. **Unidades omitidas resumidas.** Una unidad omitida por el diagnóstico se muestra en una sola línea («Omitida por el diagnóstico inicial · 6 lecciones»), así la lección actual queda a la vista sin desplazarse.
3. **Detalle de respuestas para el docente (nuevo).** En «Pruebas a revisar», cada prueba muestra:
   - el resultado **por unidad** (diagnóstico y ensayo) o **por objetivo de aprendizaje** (prueba de unidad), con barras de color;
   - en el diagnóstico, una **unidad sugerida**: la primera con menos de 75 % de logro, ya marcada en el selector y modificable por el profesor;
   - la lista **pregunta por pregunta**, con filtros «Incorrectas», «Correctas» y «Todas»: enunciado, respuesta del alumno y respuesta correcta.
   - Nuevo endpoint `GET /api/docente/evaluaciones/:id/detalle`. Solo responde al docente del curso del alumno (otro docente: 404; alumno o apoderado: 403). El alumno y el apoderado siguen sin ver la nota antes de la revisión.
4. **Corrección de contenido.** Diez preguntas «Compara a/b y c/d. ¿Cuál es mayor?» de la Unidad 3 ofrecían alternativas ajenas a la pregunta (por ejemplo 82/101). Ahora muestran solo las dos fracciones del enunciado, como ya se hacía con los números enteros desde v13. Siete de ellas forman parte de la prueba de la Unidad 3. Semilla `009_correcciones_v15.sql` (idempotente).
5. **Confirmación común** (`src/confirmar.ts`): `Alert` en Android y `window.confirm` en el navegador de desarrollo.

## Archivos

| Archivo | Cambio |
|---|---|
| `backend/src/lib/evaluaciones.js` | `detalleDocente()` |
| `backend/src/routes/docente.js` | ruta `GET /evaluaciones/:id/detalle` |
| `backend/seeds/009_correcciones_v15.sql` | nuevo |
| `backend/tests/v15.test.js` | nuevo (3 pruebas; encadena v14 → v13) |
| `backend/scripts/verificar-v15.cjs` | nuevo |
| `backend/package.json` | `npm test` y `test:v15` apuntan a v15; `verificar:v15` |
| `mobile/App.tsx` | pasa `onCerrarSesion` a «Mi camino» |
| `mobile/src/api.ts` | tipo `DetalleEvaluacion` y `api.detalleEvaluacion()` |
| `mobile/src/components/DetalleEvaluacion.tsx` | nuevo |
| `mobile/src/screens/RevisionesUnidad.tsx` | muestra el detalle y aplica la sugerencia |
| `mobile/src/screens/MiCamino.tsx` | botón «Cerrar sesión» y unidades omitidas resumidas |
| `mobile/src/components/CabeceraSesion.tsx` | usa la confirmación común |
| `mobile/src/confirmar.ts` | nuevo |
| `mobile/scripts/verificar-v15.cjs` | nuevo |

## Cómo actualizar una instalación v14

1. Detén el backend (Ctrl + C) y Metro.
2. Copia los archivos de esta versión sobre la carpeta del proyecto (reemplazar).
3. En `backend`:
   - base de demostración desde cero: `npm run db:reset` y `npm run db:demo`;
   - o conservando datos: `npm run db:seed` (aplica la semilla 009).
4. `npm run dev` en `backend`.
5. En `mobile`: `npx expo start --dev-client --host lan -c` (con `REACT_NATIVE_PACKAGER_HOSTNAME`). La APK ya instalada carga el código nuevo desde Metro.

## Verificación realizada

- `backend`: `npm test` (v15 → v14 → v13.1 → v13): **12 de 12 pruebas OK** contra PostgreSQL 16; `verificar:v14` y `verificar:v15` OK.
- `mobile`: `tsc --noEmit` OK; `verificar-v14.cjs` y `verificar-v15.cjs` OK.
- Recorrido en navegador (react-native-web, 390 × 800) con backend real: diagnóstico entregado → detalle con sugerencia → asignar unidad → camino del alumno → cerrar sesión con confirmación.
- `npm run test:legacy` mantiene los mismos 24 fallos de la v14 original en suites antiguas (`sprint2`, `semana5`, `videollamadas`, `v12`); no los introduce esta versión.
- **Pendiente:** probar en los teléfonos Android.
