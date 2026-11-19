-- Rumbo SIMCE v12: cinco unidades curriculares, evaluaciones y autorización docente.
-- La matriz fuente proporcionada es un temario de validación de estudios (Mineduc), NO
-- un facsímil oficial SIMCE. Los ejercicios y evaluaciones son originales de demostración.
ALTER TABLE pregunta ADD COLUMN IF NOT EXISTS oa_codigo VARCHAR(12);

CREATE TABLE IF NOT EXISTS unidad_oa (
 nivel_id SMALLINT NOT NULL REFERENCES nivel(id),
 oa_codigo VARCHAR(12) NOT NULL,
 descripcion VARCHAR(220) NOT NULL,
 PRIMARY KEY (nivel_id, oa_codigo)
);

CREATE TABLE IF NOT EXISTS evaluacion (
 id SMALLSERIAL PRIMARY KEY,
 codigo VARCHAR(30) NOT NULL UNIQUE,
 titulo VARCHAR(150) NOT NULL,
 tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('unidad','final')),
 nivel_id SMALLINT REFERENCES nivel(id),
 umbral NUMERIC(4,2) NOT NULL CHECK (umbral > 0 AND umbral <= 1),
 tiempo_limite_seg INTEGER NOT NULL CHECK (tiempo_limite_seg > 0),
 activa BOOLEAN NOT NULL DEFAULT TRUE,
 CONSTRAINT unidad_o_final CHECK ((tipo = 'unidad' AND nivel_id IS NOT NULL) OR (tipo = 'final' AND nivel_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_evaluacion_nivel ON evaluacion(nivel_id) WHERE tipo = 'unidad';

CREATE TABLE IF NOT EXISTS evaluacion_pregunta (
 evaluacion_id SMALLINT NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
 pregunta_id BIGINT NOT NULL REFERENCES pregunta(id),
 orden SMALLINT NOT NULL,
 PRIMARY KEY (evaluacion_id, pregunta_id),
 UNIQUE (evaluacion_id, orden)
);

CREATE TABLE IF NOT EXISTS evaluacion_intento (
 id BIGSERIAL PRIMARY KEY,
 evaluacion_id SMALLINT NOT NULL REFERENCES evaluacion(id),
 estudiante_id BIGINT NOT NULL REFERENCES estudiante(id) ON DELETE CASCADE,
 iniciado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 entregado_en TIMESTAMPTZ,
 correctas SMALLINT,
 total SMALLINT,
 porcentaje NUMERIC(5,2),
 aprobado BOOLEAN,
 revisado_en TIMESTAMPTZ,
 revisado_por BIGINT REFERENCES usuario(id),
 autorizado BOOLEAN,
 observacion VARCHAR(500),
 CHECK ((entregado_en IS NULL AND aprobado IS NULL) OR entregado_en IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_evaluacion_abierta ON evaluacion_intento(estudiante_id, evaluacion_id)
 WHERE entregado_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_eval_revisiones ON evaluacion_intento(evaluacion_id, entregado_en, revisado_en)
 WHERE entregado_en IS NOT NULL;

CREATE TABLE IF NOT EXISTS evaluacion_respuesta (
 intento_id BIGINT NOT NULL REFERENCES evaluacion_intento(id) ON DELETE CASCADE,
 pregunta_id BIGINT NOT NULL REFERENCES pregunta(id),
 opcion_elegida CHAR(1) NOT NULL CHECK (opcion_elegida IN ('A','B','C','D')),
 respondida_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (intento_id, pregunta_id)
);

-- Retirar SOLO la secuencia demostrativa de v11. Las respuestas históricas se conservan.
UPDATE conjunto SET activo = FALSE WHERE codigo LIKE 'NUM-N%';
UPDATE nivel SET orden = CASE codigo WHEN 'NUM-N1' THEN 101 WHEN 'NUM-N2' THEN 102 END WHERE codigo IN ('NUM-N1','NUM-N2') AND orden IN (1,2);
