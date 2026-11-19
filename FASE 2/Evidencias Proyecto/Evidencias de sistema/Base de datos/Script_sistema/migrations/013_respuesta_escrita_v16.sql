-- v16: respuesta escrita a mano (dedo o lápiz) en el diagnóstico y los facsímiles.
-- La conversión del banco de preguntas está en seeds/010_respuesta_escrita_v16.sql.
ALTER TABLE pregunta ADD COLUMN IF NOT EXISTS formato_respuesta text NOT NULL DEFAULT 'alternativas';
ALTER TABLE pregunta ADD COLUMN IF NOT EXISTS respuesta_numerica text;
ALTER TABLE pregunta ADD COLUMN IF NOT EXISTS respuesta_prefijo text;
ALTER TABLE pregunta ADD COLUMN IF NOT EXISTS respuesta_sufijo text;
ALTER TABLE pregunta ADD COLUMN IF NOT EXISTS forma_exacta boolean NOT NULL DEFAULT FALSE;
DO $$ BEGIN
  ALTER TABLE pregunta ADD CONSTRAINT pregunta_formato_respuesta_chk
    CHECK (formato_respuesta IN ('alternativas','entero','decimal','fraccion'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE evaluacion ADD COLUMN IF NOT EXISTS respuesta_escrita boolean NOT NULL DEFAULT FALSE;

ALTER TABLE evaluacion_respuesta ALTER COLUMN opcion_elegida DROP NOT NULL;
ALTER TABLE evaluacion_respuesta ADD COLUMN IF NOT EXISTS respuesta_texto text;   -- número confirmado por el alumno
ALTER TABLE evaluacion_respuesta ADD COLUMN IF NOT EXISTS trazos jsonb;           -- escritura original (la ve el docente)
ALTER TABLE evaluacion_respuesta ADD COLUMN IF NOT EXISTS reconocido text;        -- lo que leyó el sistema antes de que el alumno corrigiera
ALTER TABLE evaluacion_respuesta ADD COLUMN IF NOT EXISTS confianza numeric(4,3);

-- Cada fila tiene exactamente una forma de respuesta: alternativa o número escrito.
DO $$ BEGIN
  ALTER TABLE evaluacion_respuesta ADD CONSTRAINT evaluacion_respuesta_una_forma_chk
    CHECK ((opcion_elegida IS NULL) <> (respuesta_texto IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
