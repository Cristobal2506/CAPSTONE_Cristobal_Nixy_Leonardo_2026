-- v13: diagnostico obligatorio para nuevas matriculas, revision docente y replay.
ALTER TABLE evaluacion DROP CONSTRAINT IF EXISTS evaluacion_tipo_check;
ALTER TABLE evaluacion ADD CONSTRAINT evaluacion_tipo_check CHECK (tipo IN ('unidad','final','diagnostico'));
ALTER TABLE evaluacion DROP CONSTRAINT IF EXISTS unidad_o_final;
ALTER TABLE evaluacion ADD CONSTRAINT unidad_o_final CHECK (
  (tipo='unidad' AND nivel_id IS NOT NULL) OR (tipo IN ('final','diagnostico') AND nivel_id IS NULL)
);
ALTER TABLE intento ADD COLUMN IF NOT EXISTS repaso BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE intento DROP CONSTRAINT IF EXISTS intento_decision_check;
ALTER TABLE intento ADD CONSTRAINT intento_decision_check CHECK(decision IN ('avanzar','repetir','retroceder','repasar'));
ALTER TABLE evaluacion_intento ADD COLUMN IF NOT EXISTS duracion_seg INTEGER;
CREATE TABLE IF NOT EXISTS diagnostico_estado (
  estudiante_id BIGINT PRIMARY KEY REFERENCES estudiante(id) ON DELETE CASCADE,
  estado VARCHAR(12) NOT NULL CHECK(estado IN ('exento','asignado')),
  unidad_inicial SMALLINT REFERENCES nivel(id),
  asignado_por BIGINT REFERENCES usuario(id),
  asignado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Al actualizar una base existente, se respetan las posiciones pedagogicas previas;
-- solo alumnos creados DESPUES de esta migracion tendran diagnostico obligatorio.
INSERT INTO diagnostico_estado(estudiante_id,estado)
SELECT id,'exento' FROM estudiante ON CONFLICT(estudiante_id) DO NOTHING;
CREATE TABLE IF NOT EXISTS unidad_omitida_diagnostico (
  estudiante_id BIGINT NOT NULL REFERENCES estudiante(id) ON DELETE CASCADE,
  nivel_id SMALLINT NOT NULL REFERENCES nivel(id),
  PRIMARY KEY(estudiante_id,nivel_id)
);
CREATE TABLE IF NOT EXISTS notificacion (
  id BIGSERIAL PRIMARY KEY,
  estudiante_id BIGINT REFERENCES estudiante(id) ON DELETE CASCADE,
  docente_id BIGINT REFERENCES usuario(id) ON DELETE CASCADE,
  titulo VARCHAR(140) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT un_destinatario CHECK ((estudiante_id IS NOT NULL) <> (docente_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_notif_estudiante ON notificacion(estudiante_id,creada_en DESC);
CREATE INDEX IF NOT EXISTS idx_notif_docente ON notificacion(docente_id,creada_en DESC);
