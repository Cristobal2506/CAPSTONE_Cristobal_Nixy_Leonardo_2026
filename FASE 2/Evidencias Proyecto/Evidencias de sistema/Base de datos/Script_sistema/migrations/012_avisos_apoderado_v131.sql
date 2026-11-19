-- v13.1: bandeja de avisos para apoderados, además de alumnos y docentes.
ALTER TABLE notificacion ADD COLUMN IF NOT EXISTS apoderado_id BIGINT REFERENCES usuario(id) ON DELETE CASCADE;
ALTER TABLE notificacion DROP CONSTRAINT IF EXISTS un_destinatario;
ALTER TABLE notificacion ADD CONSTRAINT un_destinatario
  CHECK (num_nonnulls(estudiante_id, docente_id, apoderado_id) = 1);
CREATE INDEX IF NOT EXISTS idx_notif_apoderado ON notificacion(apoderado_id,creada_en DESC);
