# Rumbo SIMCE v16 — Respuesta escrita a mano en el diagnóstico y los facsímiles

**Fecha:** 13 de noviembre de 2026 · **Base:** v15 (código completo) · **Cambio nativo:** ninguno (el lienzo usa solo `View`: **no hace falta recompilar la APK**).

## Qué cambió

En el diagnóstico, las pruebas de unidad y el ensayo final, el alumno ya no elige una alternativa: **escribe el número con el dedo o con el lápiz de la tablet**.

1. **Escribe** en un lienzo. Puede deshacer el último trazo o borrarlo todo.
2. **El sistema lee el número**: «Leí: 3,5».
3. **El alumno confirma o corrige.** Si una cifra es dudosa (menos de 70 % de seguridad), la app pregunta «¿El 2.º número es 4, 9 o 7?». La respuesta se guarda recién cuando el alumno confirma, así que **un error del lector nunca se convierte en una respuesta incorrecta sin que el alumno lo vea**.

Formatos de respuesta:

- **Entero:** un lienzo.
- **Decimal:** un lienzo; la coma es una marca pequeña abajo.
- **Fracción:** dos lienzos, numerador y denominador, con la línea de fracción dibujada.

Si la pregunta tiene unidad («45 cm») o signo «$», se muestran junto al lienzo.

**Corrección por valor:** `3,50` = `3,5`, `03456` = `3456` y `6/8` = `3/4`. Para exigir una forma exacta («simplifica 6/8»), marca `pregunta.forma_exacta = TRUE`.

**Docente («Pruebas a revisar»):** por cada pregunta ve la **escritura original del alumno** (miniatura) y lo que leyó el sistema. Un aviso aparece si el alumno corrigió la lectura o si la lectura fue poco segura.

**Preguntas que siguen con alternativas:** las que necesitan ver las opciones («¿Cuál de los siguientes…?», verdadero/falso) o cuya respuesta no es un número («Cono»). La consulta para revisarlas está al final de la semilla 010.

Las **lecciones Kumon no cambian**: las alternativas no se borran del banco.

## Investigación: ¿qué biblioteca usar?

| Opción | Qué es | Escritura de niños en tablet | Funciona sin internet / privacidad | Esfuerzo en nuestro stack | Veredicto |
|---|---|---|---|---|---|
| **Tesseract OCR** | OCR clásico para texto impreso | Malo: está optimizado para letra impresa y falla con escritura a mano, incluso solo con dígitos | Sí | Medio | ❌ |
| **OpenCV** | Biblioteca de visión: umbral, contornos, recortes | No reconoce por sí sola: segmenta y normaliza, y necesita un clasificador (CNN/SVM con MNIST) | Sí | Alto en Node (compilación nativa) | ⚠️ Solo preprocesamiento |
| **Google ML Kit – Text Recognition** | OCR de fotos | Pensado para texto impreso en imágenes | Sí | APK nueva | ❌ |
| **Google ML Kit – Digital Ink** | Reconoce trazos (no fotos) en tiempo real | Muy bueno: está hecho para escribir en pantalla | Requiere bajar un modelo de ~20 MB por idioma | **Módulo nativo y APK nueva**; los envoltorios para React Native son pequeños y con poco mantenimiento | ✅ Mejora futura |
| **Nube (Google Vision, Azure)** | OCR en servidores externos | Bueno | **No**: envía la escritura de menores a terceros, tiene costo y depende de internet | Bajo | ❌ por privacidad |
| **CNN entrenada con MNIST + ONNX Runtime** *(elegida)* | Red neuronal de dígitos 0–9 en formato estándar ONNX | Muy bueno en dígitos sueltos, si se normaliza como MNIST | Sí: todo queda en nuestro servidor | Bajo: paquete npm `onnxruntime-web`, sin binarios nativos | ✅ |

**Por qué esta opción:**

1. **Captura vectorial:** el lienzo guarda los trazos como puntos, no como foto. Separar las cifras es entonces más simple y exacto que con OpenCV sobre una imagen. Por ejemplo, un 4 de dos trazos se agrupa por superposición horizontal, y no hay sombras ni iluminación que limpiar.
2. **Normalización como MNIST:** cada cifra se escala a una caja de 20×20 dentro de 28×28 y se centra por centro de masa. Es lo que hacen los ejemplos con OpenCV, pero hecho directamente sobre los trazos, en `src/lib/reconocimiento/trazos.js`.
3. **ONNX Runtime de Microsoft:** ejecuta el modelo en un hilo aparte. Funciona igual en Windows, macOS y Linux, sin compilar nada.
4. **No hace falta APK nueva:** el lienzo está hecho con `View` de React Native.
5. **Privacidad:** la escritura de los alumnos (menores de edad) no sale del servidor del proyecto.
6. **Camino de mejora:** el mismo `.onnx` puede correr en el teléfono con `onnxruntime-react-native`, o se puede cambiar el lector por ML Kit Digital Ink sin tocar las pantallas, porque la API devuelve el mismo formato de lectura.

**Medición:**

| Prueba | Resultado |
|---|---|
| Dígitos MNIST reservados (1 500, nunca vistos en el entrenamiento) | **98,1 %** |
| Dígitos «de niño» generados con trazos deformados (600) | **99,7 %** |
| Números de 1 a 4 cifras (200) | **99,5 %** |
| Decimales con coma (50) | **100 %** |
| Tiempo por número de 4 cifras | ~10 ms |

> Los trazos sintéticos son una aproximación. **La prueba que importa es con alumnos reales en las tablets**, y por eso existe el paso de confirmación. Para medirlo, usa `npm run demo:reconocimiento` (ver abajo).

## Archivos

| Archivo | Cambio |
|---|---|
| `backend/modelos/digitos.onnx` | **nuevo**: modelo entrenado (1,8 MB) |
| `backend/src/lib/reconocimiento/` (`index.js`, `trazos.js`, `modelo-worker.js`, `esquema.js`) | **nuevo**: lector de números escritos. Segmentación y normalización estilo OpenCV/MNIST; ONNX Runtime en un hilo aparte |
| `backend/src/routes/reconocimiento.js` + `src/app.js` | **nuevo** `POST /api/reconocimiento/numero` (requiere sesión; no guarda nada) |
| `backend/src/routes/evaluaciones.js` | `PUT …/respuesta` acepta `opcion` **o** `{respuesta, trazos, reconocido, confianza}` |
| `backend/src/lib/respuestaNumerica.js` | **nuevo**: normalización y corrección numérica (notación chilena) |
| `backend/src/lib/evaluaciones.js` | preguntas escritas sin alternativas ni respuesta correcta; corrección por valor; detalle docente con la escritura. Un intento comenzado antes de v16 conserva sus alternativas ya marcadas |
| `backend/migrations/013_respuesta_escrita_v16.sql` | **nuevo**: columnas `pregunta.formato_respuesta`, `respuesta_numerica`, `respuesta_prefijo`, `respuesta_sufijo`, `forma_exacta`; `evaluacion.respuesta_escrita`; `evaluacion_respuesta.respuesta_texto`, `trazos`, `reconocido`, `confianza` |
| `backend/seeds/010_respuesta_escrita_v16.sql` | **nuevo** (idempotente): activa la respuesta escrita en las evaluaciones vigentes y convierte el banco |
| `backend/scripts/demo-reconocimiento.js` + `backend/public/pizarra.html` | **nuevo**: demo para probar el lector en la tablet sin base de datos |
| `backend/tests/reconocimiento.test.js`, `tests/fixtures/trazosSinteticos.js`, `jest.reconocimiento.config.js` | **nuevos**: 6 pruebas sin base de datos |
| `backend/tests/v16.test.js` | **nuevo**: 3 pruebas integradas (encadena v15 → v14 → v13.1 → v13) |
| `backend/tests/helpers.js` + `v12`, `v13`, `v15.test.js` | `cuerpoRespuesta()`: las pruebas antiguas responden con alternativa o número escrito según la pregunta |
| `backend/scripts/verificar-v16.cjs`, `backend/package.json` | dependencia `onnxruntime-web`; scripts `test` (v16), `test:v16`, `test:reconocimiento`, `verificar:v16`, `demo:reconocimiento` |
| `.github/workflows/ci.yml` | agrega `npm run test:reconocimiento` |
| `mobile/src/components/PizarraNumero.tsx`, `Trazos.tsx` | **nuevos**: lienzo para dedo o lápiz y dibujo de trazos con `View` |
| `mobile/src/components/RespuestaEscrita.tsx`, `PreguntaRespuesta.tsx` | **nuevos**: escribir → leer → confirmar o corregir |
| `mobile/src/screens/RendirEvaluacion.tsx` | usa la respuesta escrita en las preguntas numéricas y bloquea el scroll mientras el alumno escribe |
| `mobile/src/components/DetalleEvaluacion.tsx` | muestra la escritura del alumno y los avisos de lectura |
| `mobile/src/api.ts` | tipos nuevos, `reconocerNumero()` y `responderEvaluacionEscrita()` |
| `mobile/scripts/verificar-v16.cjs`, `mobile/package.json` | script `verificar:v16` |
| `herramientas/entrenar-modelo/` | **nuevo**: script para reentrenar el modelo (PyTorch → ONNX) |

## Banco de preguntas convertido (semilla 010)

| Evaluación | Preguntas | Respuesta escrita | Siguen con alternativas |
|---|---|---|---|
| Diagnóstico (DIAG-INICIAL-V131) | 40 | 27 (22 enteros, 5 fracciones) | 13 |
| Pruebas de unidad U1, U2 y U4 | 75 | 75 (enteros) | 0 |
| Prueba de unidad U3 (fracciones) | 25 | 25 (fracciones) | 0 |
| Prueba de unidad U5 (geometría, medición y datos) | 25 | 13 (enteros, con cm, cm² o m² cuando corresponde) | 12 |
| Ensayo final | 40 | 35 (30 enteros, 5 fracciones) | 5 |

Siguen con alternativas las preguntas cuya respuesta no es un número o que necesitan ver las opciones: figuras y simetría, días de un pictograma, expresiones («200 × 4 + 3 × 4»), «¿Cuál de estas cantidades…?», coordenadas y direcciones de una flecha. La consulta para revisarlas está al final de la semilla.

## Cómo actualizar una instalación v15

1. Detén el backend (Ctrl + C) y Metro.
2. Copia los archivos de esta versión sobre la carpeta del proyecto (reemplazar).
3. En `backend`: `npm install` (agrega `onnxruntime-web`).
4. Base de datos:
   - conservando datos: `npm run db:seed` (aplica la migración 013 y la semilla 010);
   - desde cero: `npm run db:reset` y `npm run db:demo`.
5. `npm run dev` en `backend`.
6. En `mobile`: `npx expo start --dev-client --host lan -c` (con `REACT_NATIVE_PACKAGER_HOSTNAME`). **No hace falta recompilar la APK**: el lienzo no usa módulos nativos.

### Probar solo el lector en la tablet (sin base de datos ni app)

```bash
cd backend
npm run demo:reconocimiento
# abre en el navegador de la tablet la dirección que aparece: http://IP-DEL-PC:3100
```

## Verificación realizada

**Backend** (contra PostgreSQL 16):

| Prueba | Resultado |
|---|---|
| `npm test` (v16 → v15 → v14 → v13.1 → v13) | **15 de 15 OK** |
| `npm run test:reconocimiento` | **6 de 6 OK** |
| `verificar:v13`, `v13.1`, `v14`, `v15` y `v16` | OK |
| `npm run test:legacy` | **los mismos 24 fallos de v15**, comparados prueba por prueba, en las suites antiguas `sprint2`, `semana5`, `videollamadas` y `v12`; **ninguna falla nueva** |

**Mobile:**
- `tsc --noEmit` de toda la app: OK.
- Verificadores `v14`, `v15` y `v16`: OK.

**Recorrido en navegador** (react-native-web, 800 px de ancho, con backend real y datos demo):
1. El alumno Tomi inicia el diagnóstico.
2. Escribe «400» con trazos → «Leí: 400» → confirma.
3. En la pregunta 17 escribe la fracción «3/8» en numerador y denominador → confirma.
4. Completa y entrega.
5. El docente abre «Pruebas a revisar»: ve la sugerencia de la Unidad 3, cada respuesta escrita con la miniatura de la escritura del alumno y los avisos de lectura corregida.

Para la prueba web se usó un sustituto temporal de LiveKit (no incluido), porque LiveKit es nativo.

**Pendiente: probar en tablets Android con dedo y lápiz.** En especial:
- que el lienzo no haga desplazarse la pantalla mientras se escribe;
- la tasa de lectura correcta con escritura real de niños.
