# Catálogo de casos de uso — Rumbo SIMCE (MVP)

Derivado de los requerimientos funcionales del Informe Fase 1 (RF01–RF12).
La columna **Sprint** sigue la Tabla 10 del informe (Sprint 1 = primera y segunda semana de desarrollo).
Los encargados son una **propuesta**: se confirman en la planificación del Sprint 1.

| CU | Nombre | Actor(es) | RF | Sprint | Encargado propuesto |
|---|---|---|---|---|---|
| CU01 | Iniciar y cerrar sesión según rol | Estudiante, Apoderado, Docente | RF10 | 1 | Cristóbal Muñoz |
| CU02 | Registrar cuenta de apoderado o docente | Apoderado, Docente | RF10 | 1 | Cristóbal Muñoz |
| CU03 | Registrar consentimiento de tratamiento de datos | Apoderado | RF12 | 1 | Nixy Silva |
| CU04 | Crear perfil de estudiante y vincularlo al apoderado | Apoderado | RF10, RF11 | 1 | Nixy Silva |
| CU05 | Crear curso | Docente | RF10, RF08 | 1 | Leonardo Figueroa |
| CU06 | Inscribir estudiante en un curso con código | Apoderado | RF08, RF11 | 1 | Leonardo Figueroa |
| CU07 | Recuperar contraseña | Apoderado, Docente | RF10 | 1 | Cristóbal Muñoz |
| CU08 | Gestionar banco de preguntas por eje | Administrador | RF02 | 2 | Cristóbal Muñoz |
| CU09 | Jugar una misión | Estudiante | RF02 | 2 | Leonardo Figueroa |
| CU10 | Ver mapa de islas y avance por eje | Estudiante | RF01 | 3 | Leonardo Figueroa |
| CU11 | Registrar progreso por eje y sesión | Sistema | RF06 | 3 | Cristóbal Muñoz |
| CU12 | Recibir retroalimentación inmediata | Estudiante | RF04 | 4 | Leonardo Figueroa |
| CU13 | Ajustar dificultad adaptativa | Sistema | RF03 | 4 | Cristóbal Muñoz |
| CU14 | Detectar patrón de error y reexplicar con otra estrategia | Sistema, Estudiante | RF05 | 5 | Cristóbal Muñoz |
| CU15 | Obtener recompensas e hitos | Estudiante | RF09 | 6 | Leonardo Figueroa |
| CU16 | Ver progreso del estudiante y alertas | Apoderado | RF07 | 6 | Nixy Silva |
| CU17 | Ver progreso agregado del curso | Docente | RF08 | 6 | Nixy Silva |

## Decisiones de diseño tomadas en el Sprint 1

- **El estudiante no tiene correo ni RUT.** Entra con un *código de acceso* de 6 caracteres y un PIN de 4 dígitos que crea su apoderado. Cumple minimización de datos (Ley 21.719) y RNF01 (un niño de 9–10 años no maneja correo).
- **Sin consentimiento no hay estudiante.** La API rechaza crear un perfil de estudiante si el apoderado no tiene un consentimiento vigente (CU03 → CU04).
- **Administrador:** queda fuera del registro público. Mientras el cliente no confirme su alcance, el banco de preguntas se carga por *seed* (CU08).
- **Bloqueo por intentos (HU-04).** 5 intentos fallidos → bloqueo de 15 min, para adultos y estudiantes. El mensaje al niño es amable ("descansa un ratito"). Restablecer la contraseña levanta el bloqueo; `npm run db:demo` desbloquea las cuentas de prueba.
- **Recuperación con código en vez de enlace (CU07).** No hay sitio web donde abrir un enlace y los enlaces profundos no funcionan bien con Expo Go, así que el correo trae un código de 6 dígitos que se escribe en la app. *Actualizar el criterio de aceptación de HU-02 ("enlace" → "código").*
- **Perfil (HU-05/06).** El adulto edita su nombre y cambia su contraseña confirmando la actual. El correo no se edita todavía: cambiarlo exige verificar el correo nuevo. El estudiante solo cambia su avatar (el apodo lo administra el apoderado).

## Decisiones de diseño tomadas en el Sprint 2 (semana 3)

- **Catálogo de tipos de error (CU08).** Cada distractor declara el error típico que lo explica (`tipo_error`). La API rechaza una pregunta si la correcta trae error, si un distractor no lo trae o si el error es de otro eje. Así cada respuesta incorrecta queda clasificada (HU-16) sin que el niño haga nada extra, y el CU14 tendrá datos desde el primer día.
- **Revisión pedagógica.** Las 37 preguntas del seed son un borrador del equipo. En producción solo se juegan las marcadas como revisadas; editar el contenido de una pregunta la vuelve a dejar pendiente.
- **Eliminar = desactivar.** Las respuestas ya registradas apuntan a la pregunta; borrarla rompería la trazabilidad.
- **Misión de 6 preguntas (CU09 / HU-11).** Configurable (`PREGUNTAS_POR_MISION`). Se eligen primero las que el niño ha visto menos y las más cercanas a su nivel, y se ordenan de la más fácil a la más difícil. Por ahora el nivel es el de la misión anterior del eje (o 1): el ajuste según desempeño es el CU13 (Sprint 4). *Validar el largo con la prueba de usuarios.*
- **La misión se cierra sola** al responder la última pregunta y registra su duración. Si el niño sale antes, la sesión queda abierta: es la base de HU-12 (retomar misión, Sprint 3).
- **Sin consentimiento no se juega (RF12).** La API exige que un apoderado vinculado tenga consentimiento vigente para iniciar una misión y para registrar cada respuesta.
- **Texto del consentimiento versionado (HU-29).** Vive en la API (`src/lib/consentimiento.js`) y la app lo muestra antes de aceptar. Es un **borrador**: falta el texto legal de Triskel Edu y el plazo de conservación. Un consentimiento de una versión anterior no cuenta como vigente en la app.
- **Avatares provisorios.** 6 animales con emoji (cóndor, llama, zorro, pingüino, ballena, tortuga) hasta tener las ilustraciones.

## Decisiones de diseño tomadas en la semana 4 (cierre del Sprint 2 y adelanto del Sprint 3)

- **Ingreso visual del estudiante (HU-03).** El teléfono recuerda a los estudiantes que ya entraron o que su apoderado dejó listos («Preparar este teléfono para jugar»). El niño toca su avatar y escribe el PIN en un teclado numérico grande; al cuarto número entra solo. Se guarda cifrado (expo-secure-store) el código, apodo y avatar de hasta 6 estudiantes, **nunca el PIN**. La primera vez sigue siendo con código + PIN. *Acerca lo implementado a RF-03 de la lista de requerimientos («seleccionar avatar + PIN») sin quitar el código, que es la credencial.*
- **Retomar misión (HU-12).** Una misión queda *abierta*, *terminada* o *abandonada* (migración 004). Al entrar a una isla con una misión a medias (al menos una respuesta, empezada hace menos de 24 h, configurable con `HORAS_PARA_RETOMAR_MISION`), la app ofrece «Continuar donde quedé» o «Empezar de nuevo». Empezar otra misión en la misma isla deja la anterior como abandonada: **a lo más una misión abierta por isla**. Las respuestas de una misión abandonada se conservan y cuentan para el progreso.
- **Progreso calculado, no guardado aparte (CU11).** El avance por eje se calcula desde `sesion` y `respuesta`, que ya registran todo; así no hay dos fuentes de verdad. Vive en `src/lib/progreso.js` para reutilizarlo en los paneles del apoderado (CU16) y del docente (CU17). Se informa el acierto histórico y el **acierto reciente** (últimas 10 respuestas del eje), que dice cómo va el niño *ahora*.
- **Mapa con avance (CU10, parcial).** Cada isla muestra «¡Isla nueva por explorar!» o «N misiones · X% correctas» con una barra (además del texto, para no depender del color). **Todas las islas siguen abiertas**: bloquear/desbloquear (HU-08/HU-10) espera el criterio de dominio de Triskel Edu. El avatar del niño aparece en el mapa (parte de HU-07).
- **Formulario de preguntas en la app (CU08).** El administrador crea y edita preguntas: 3 o 4 opciones, marca la correcta y elige para cada opción incorrecta el error típico (solo los del eje y los transversales). Aplica las mismas reglas que la API antes de enviar.

## Decisiones de diseño tomadas en la semana 5 (motor Kumon, 2.ª revisión del cliente)

- **La app del estudiante pasa a Kumon.** «Mi camino» (progresión lineal, CU10) reemplaza al mapa de islas y la «tanda diaria» (CU09) reemplaza a la misión. Las pantallas de mapa y misión se retiraron de la app; sus endpoints quedan en la API como versión anterior (fase siguiente).
- **Modelo (migración 005):** `nivel` → `conjunto` (tanda diaria, con objetivo de aprendizaje y tiempo estándar) → `hoja` (ejemplo resuelto) → `hoja_ejercicio` (ejercicios del banco, CU08). `intento` registra cada vez que el estudiante hace un conjunto; `intento_respuesta` guarda cada respuesta por ronda; `estudiante_posicion` dice dónde va en la secuencia.
- **Sin feedback mientras responde.** Como en la hoja de papel: el estudiante no sabe si acertó hasta tocar «Revisar». La revisión marca los incorrectos **sin mostrar la respuesta correcta ni explicar** (la reexplicación la hará el profesor, CU22).
- **El tiempo lo mide el servidor**, desde que empieza la tanda hasta la primera revisión; el reloj de la app es solo referencia.
- **Reglas provisorias (configurables con `KUMON_*`):** dominar = 100% a la primera y dentro del tiempo estándar; retroceder si el acierto a la primera es menor al 50%; 3 intentos seguidos sin el estándar → «requiere profesor»; el cierre de nivel espera al profesor. **Validar con el profesor Kumon / Triskel Edu.**
- **Contenido provisorio generado por código.** Los ejercicios de práctica (valor posicional, adición con reserva, sustracción con canje, tablas) y sus ejemplos resueltos se generan con `scripts/generar-secuencia.js`: la respuesta y cada distractor con su error típico se calculan, así no hay errores de contenido. Dosis: 2 hojas × 3 ejercicios por conjunto. Tiempos estándar y etiquetas de objetivo de aprendizaje **provisorios**.
- **Se mantiene selección múltiple** (formato SIMCE) para los ejercicios hasta ver los facsímiles: definirán si algunas hojas deben ser de respuesta abierta.
- **Accesibilidad web:** las opciones y casillas declaran también `aria-checked` (react-native-web ya no traduce `accessibilityState`).
