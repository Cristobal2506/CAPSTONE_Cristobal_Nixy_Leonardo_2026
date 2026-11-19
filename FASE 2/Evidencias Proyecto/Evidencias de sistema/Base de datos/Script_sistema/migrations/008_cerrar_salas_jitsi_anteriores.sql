-- v11: No reutilizar solicitudes que fueron aceptadas en Jitsi publico.
-- En una BD nueva no hay filas a actualizar.
-- Los estados pendientes y los datos de progreso educativo no se alteran.
UPDATE videollamada
   SET estado = 'finalizada', finalizada_en = COALESCE(finalizada_en, now())
 WHERE estado = 'aceptada'
   AND sala_url LIKE 'https://meet.jit.si/%';
