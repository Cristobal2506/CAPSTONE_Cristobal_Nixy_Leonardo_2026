-- Sprint 2 — CU08 Gestionar banco de preguntas por eje · CU09 Jugar una misión
--   - Catálogo de tipos de error: cada distractor de una pregunta apunta a un error típico.
--     Es la base para registrar el tipo de error de cada respuesta (HU-16) y, en el Sprint 5,
--     para detectar patrones de error (CU14).
--   - La pregunta recibe un código legible (NUM-01) para que los seeds sean idempotentes y
--     para poder conversarla con el equipo pedagógico de Triskel Edu.
--   - La sesión guarda qué preguntas se le asignaron al estudiante y en qué orden.

CREATE TABLE tipo_error (
  codigo       VARCHAR(40) PRIMARY KEY,
  eje_id       SMALLINT REFERENCES eje(id),      -- NULL = error transversal (ej: cálculo)
  descripcion  VARCHAR(200) NOT NULL
);

ALTER TABLE pregunta
  ADD COLUMN codigo         VARCHAR(20) UNIQUE,
  ADD COLUMN creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD CONSTRAINT pregunta_respuesta_valida CHECK (respuesta_correcta IN ('A','B','C','D'));

ALTER TABLE sesion
  ADD COLUMN pregunta_ids BIGINT[] NOT NULL DEFAULT '{}';

-- Una pregunta se responde una sola vez por misión.
ALTER TABLE respuesta
  ADD CONSTRAINT respuesta_unica_por_sesion UNIQUE (sesion_id, pregunta_id),
  ADD CONSTRAINT respuesta_tipo_error_fk FOREIGN KEY (tipo_error) REFERENCES tipo_error(codigo);

CREATE INDEX idx_respuesta_pregunta ON respuesta(pregunta_id);
