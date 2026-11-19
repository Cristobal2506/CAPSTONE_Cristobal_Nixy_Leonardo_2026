# Rumbo SIMCE v16.1 — El alumno nunca queda sin lección para jugar

**Fecha:** 14 de noviembre de 2026 · **Base:** v16 · **Cambio nativo:** ninguno (no hace falta recompilar la APK) · **Base de datos:** sin cambios.

## El problema (caso «Iris»)

1. Iris dominó la lección 1 de la Unidad 2 y pasó a la lección 2.
2. Falló gran parte de la lección 2 (menos de 50 % de acierto en la primera vuelta). La regla Kumon de **retroceso** la devolvió a la lección 1.
3. Como la lección 1 ya estaba dominada, el camino la mostraba como **«Dominado»** y no como la lección que tocaba:
   - no quedaba ninguna lección marcada para jugar;
   - el botón **«Hacer la tanda de hoy» se apagaba**;
   - la Unidad 2 aparecía con candado.
4. La única opción visible era **«Volver a practicar»**, que cuenta como **repaso**: un repaso nunca mueve la posición, así que por más veces que repitiera la lección 1, no avanzaba.

## La corrección

- **La lección donde está el alumno siempre aparece como la actual** («▶ Jugar lección»), aunque ya la haya dominado antes. El texto dice «Vuelve a hacerla para seguir avanzando».
- **Jugar la lección actual nunca cuenta como repaso**, aunque se entre por «Volver a practicar»: si cumple la meta, avanza.
- **Los alumnos que ya quedaron atascados se destraban solos** al abrir la app actualizada. No hay que tocar la base de datos.
- **No hay límite diario:** el alumno puede encadenar todas las lecciones que quiera el mismo día. El nombre «tanda de hoy» es solo una etiqueta.

**Se mantiene, por regla del cliente:** al terminar todas las lecciones de una unidad, el alumno rinde la prueba de unidad y el profesor autoriza el paso a la siguiente. Mientras espera puede repasar cualquier lección dominada y entrar a «Pruebas».

## Archivos

| Archivo | Cambio |
|---|---|
| `backend/src/lib/kumon.js` | `camino()`: la lección de la posición es siempre «actual» (nuevo campo `yaDominado`). `iniciarTanda()`: jugar la lección actual no es repaso |
| `backend/tests/v161.test.js` | **nuevo**: 4 pruebas (retroceso a lección dominada, «Volver a practicar» en la actual, varias lecciones el mismo día y alumno ya atascado) |
| `backend/package.json` | versión 0.16.1; `npm test` y `npm run test:v16` ejecutan la cadena v16.1 → v16 → v15 → v14 → v13.1 → v13 |
| `mobile/src/api.ts`, `mobile/src/screens/MiCamino.tsx` | texto «Vuelve a hacerla para seguir avanzando» en la lección actual ya dominada |

## Cómo actualizar desde la v16

1. Detén el backend y Metro.
2. Reemplaza los archivos (o descomprime esta versión y copia tus dos `.env`).
3. Inicia `npm run dev` en `backend`.
4. Inicia `npx expo start --dev-client --host lan -c` en `mobile`.

No hace falta `npm install`, ni `db:seed`, ni APK nueva.

## Verificación

- Las 4 pruebas nuevas **fallaban con la v16** (reproducían el caso de Iris) y **pasan con la v16.1**.
- `npm test`: **19 de 19 OK**.
- `npm run test:reconocimiento`: **6 de 6 OK**.
- Suite completa: **los mismos 24 fallos antiguos de la v15**, comparados prueba por prueba; **ninguna falla nueva** (138 pruebas aprobadas).
- `mobile`: `tsc --noEmit` OK; verificadores v14, v15 y v16 OK.
