-- CU23 v9: no entregar por error enlaces aceptados por el proveedor anterior.
-- Esta migracion es inocua en una instalacion nueva.
-- No borra solicitudes, solo marca como finalizadas las salas legadas.
UPDATE videollamada
   SET estado = 'finalizada', finalizada_en = COALESCE(finalizada_en, now())
 WHERE estado = 'aceptada'
   AND sala_url LIKE 'https://%.daily.co/%';
