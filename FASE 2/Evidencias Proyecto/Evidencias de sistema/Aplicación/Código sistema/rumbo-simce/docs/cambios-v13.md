# Rumbo SIMCE v13 — Registro técnico

La v13 implementa: diagnóstico obligatorio e irrevocable para alumnos nuevos; puerta de entrada antes del camino; asignación docente de unidad inicial con saltos pedagógicos; pruebas finales de 25 preguntas con 50 minutos; bandeja de pruebas **todas** las entregadas; comentarios obligatorios y decisión humana; avisos internos a docente y estudiante; replay no destructivo de conjuntos dominados y play en conjunto actual; privacidad de puntajes hasta revisión; correcciones de valor posicional y comparación de solo dos alternativas; botón de salir en zona segura Android; persistencia de respuestas y límite efectivo del tiempo.

Mecanismo de datos: migración `010_...sql` más seed idempotente `006_...sql`, después de los archivos anteriores. En instalaciones limpias usar `npm run db:reset` solo con datos ficticios descartables. En bases existentes usar `npm run db:seed` tras respaldar; los perfiles preexistentes quedan exentos de repetir diagnóstico (se protege su progreso). Los usuarios nuevos deben cursarlo.

Lección repetida: `intento.repaso = TRUE`; se revisa igual que una tanda normal, pero el motor no ejecuta transición de estudiante_posicion y devuelve `decision='repasar'`.

Calificación: el cálculo automático interno de correctas/porcentaje se guarda al entregar, pero los endpoints del estudiante los ocultan mientras `revisado_en IS NULL`. El docente responsable del curso ve todas las notas, aprueba/reprueba o selecciona unidad inicial y debe enviar observación. La API emite notificaciones persistidas dentro de la app; NO son push OS.

Tiempo: el backend impide nuevas respuestas vencido `tiempo_limite_seg` y permite entregar parcialmente al llegar al límite. El reloj del móvil es una representación de hora relativa basada en `iniciado_en`.

Pendiente de validar fuera de este entorno: `npm install`, `npm test` con PostgreSQL, `npm run typecheck`, compilación Gradle en Windows con JDK 21 y pruebas en dos teléfonos. No se modificó el módulo LiveKit.
