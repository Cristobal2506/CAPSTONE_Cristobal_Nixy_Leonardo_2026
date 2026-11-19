-- Semana 4 — HU-12 Retomar una misión incompleta (CU09)
-- Una misión queda en uno de tres estados:
--   abierta     → terminada_en y abandonada_en en NULL (se puede retomar)
--   terminada   → se respondieron todas sus preguntas (terminada_en)
--   abandonada  → el niño eligió empezar otra o pasó demasiado tiempo (abandonada_en)
-- Las respuestas de una misión abandonada se conservan: cuentan para el progreso (CU11).
ALTER TABLE sesion ADD COLUMN abandonada_en TIMESTAMPTZ;

-- Búsqueda rápida de la misión abierta de un estudiante en un eje.
CREATE INDEX idx_sesion_abierta ON sesion(estudiante_id, eje_id)
  WHERE terminada_en IS NULL AND abandonada_en IS NULL;
