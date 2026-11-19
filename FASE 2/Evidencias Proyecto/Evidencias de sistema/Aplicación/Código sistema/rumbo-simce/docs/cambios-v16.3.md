# Rumbo SIMCE v16.3 — Las lecciones del camino también se escriben

**Fecha:** 15 de noviembre de 2026 · **Base:** v16.2 · **APK nueva:** no hace falta (no cambia nada nativo) · **Base de datos:** migración 014 y semilla 011.

## Qué cambió

Pedido del cliente: que el alumno use el dedo o el lápiz casi siempre, y no solo alternativas.

- **Lecciones del camino (hojas Kumon):** los ejercicios cuya respuesta es un número se responden **escribiendo**. Es el mismo lienzo de las pruebas: escribir → «Leí: …» → confirmar o corregir.
  - **260 de 320 ejercicios (81 %)** pasan a escritura: 208 enteros y 52 fracciones.
  - Los 60 restantes siguen con alternativas, porque su respuesta no es un número («¿Qué día llovió más?», transformaciones, figuras, ecuaciones) o porque aceptan varias respuestas válidas (desigualdades, rangos, fracciones equivalentes). Decisión del equipo: esos no se reescriben.
- **Revisar y corregir funciona igual:** al revisar, los ejercicios incorrectos se marcan con ✖ sin mostrar la respuesta, y vuelven con el lienzo limpio para corregirlos. Lo ya correcto queda con ✔ y el número escrito.
- **Corrección por valor**, como en las pruebas: `0450` = `450`, `2/4` = `1/2`. Si el enunciado pide simplificar, se exige la forma exacta (`pregunta.forma_exacta`).
- **Meta de tiempo:** escribir y confirmar toma más que tocar una alternativa. La meta de cada tanda suma **10 segundos por ejercicio escrito**, ajustable con `KUMON_SEGUNDOS_EXTRA_ESCRITURA` en `backend/.env`. Ejemplo: una lección de 10:00 con 10 ejercicios escritos queda con meta 11:40.
- **Tipo de error:** si lo escrito coincide con una alternativa incorrecta, se registra el mismo tipo de error que si la hubiera elegido.
- **Pruebas de unidad y ensayo:** las preguntas con varias respuestas válidas (desigualdades) vuelven a alternativas para no corregirlas mal. Unidad: 111 de 125 escritas. Ensayo: 34 de 40. Diagnóstico: sin cambios (27 de 40).

## Archivos

| Archivo | Cambio |
|---|---|
| `backend/migrations/014_lecciones_escritas_v163.sql` | **nuevo**: `intento_respuesta.respuesta_texto`, `trazos`, `reconocido`, `confianza`; `opcion_elegida` pasa a ser opcional |
| `backend/seeds/011_lecciones_escritas_v163.sql` | **nuevo** (idempotente): convierte los ejercicios numéricos de las lecciones y marca «simplifica» como forma exacta |
| `backend/seeds/010_respuesta_escrita_v16.sql` | excluye las preguntas con varias respuestas válidas |
| `backend/src/lib/kumon.js` | la tanda envía `formatoRespuesta` (sin alternativas ni respuesta correcta en los escritos); `responder()` acepta un número escrito; meta de tiempo con segundos extra |
| `backend/src/routes/estudiante.js` | `POST /tandas/:id/respuestas` acepta `opcion` **o** `{respuesta, trazos, reconocido, confianza}` |
| `backend/src/config.js` | `KUMON_SEGUNDOS_EXTRA_ESCRITURA` (10 por defecto) |
| `backend/tests/v163.test.js` | **nuevo**: 4 pruebas |
| `backend/tests/helpers.js`, `v161`, `semana5`, `videollamadas` | `cuerpoTanda()`: responden con alternativa o número escrito según el ejercicio |
| `mobile/src/screens/Tanda.tsx` | respuesta escrita en los ejercicios numéricos y bloqueo del scroll mientras se escribe |
| `mobile/src/api.ts` | `responderTandaEscrita()` y tipos nuevos |
| `mobile/scripts/verificar-v16.cjs` | comprueba también las lecciones |

## Cómo actualizar desde la v16.2

1. Detén el backend y Metro.
2. Copia los archivos de esta versión sobre tu carpeta.
3. En `backend`, ejecuta `npm run db:seed`. Aplica la migración 014 y la semilla 011, y conserva los datos.
4. Inicia `npm run dev` en `backend`.
5. Inicia Metro con `npx expo start --dev-client --host lan -c` en `mobile`.

**No hace falta compilar una APK nueva**: la APK de la v16.2 carga el código nuevo desde Metro.

Si una tanda quedó a medio hacer antes de actualizar, se puede terminar: sus respuestas guardadas con alternativa siguen valiendo.

## Verificación

- `npm test`: **23 de 23 OK** (cadena v16.3 → v16.1 → v16 → v15 → v14 → v13.1 → v13).
- `npm run test:reconocimiento`: 6 de 6 OK.
- Semillas idempotentes: aplicadas dos veces, el banco queda igual.
- Suite completa: **los mismos 24 fallos antiguos de la v15**, comparados prueba por prueba; **ninguna falla nueva** (161 aprobadas).
- `mobile`: `tsc --noEmit` OK; verificadores v14, v15 y v16 OK.
- Recorrido real en navegador (app web con backend y datos demo, 1280 × 800):
  1. El alumno abre «Hacer la tanda de hoy» en «Numeración hasta 10.000». Los 10 ejercicios se responden escribiendo.
  2. Uno se escribe mal a propósito. Al revisar queda marcado ✖ con el lienzo limpio.
  3. Lo corrige con «Cambiar respuesta» y la tanda termina: 8/10 a la primera, meta 11:40, decisión «repetir».
