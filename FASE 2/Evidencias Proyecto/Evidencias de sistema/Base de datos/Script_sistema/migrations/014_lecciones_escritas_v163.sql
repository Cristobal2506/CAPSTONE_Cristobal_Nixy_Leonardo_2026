-- v16.3: las lecciones del camino (hojas Kumon) también se responden escribiendo el número con el dedo o el lápiz.
-- La conversión de los ejercicios está en seeds/011_lecciones_escritas_v163.sql.
ALTER TABLE intento_respuesta ALTER COLUMN opcion_elegida DROP NOT NULL;
ALTER TABLE intento_respuesta ADD COLUMN IF NOT EXISTS respuesta_texto text;   -- número confirmado por el alumno
ALTER TABLE intento_respuesta ADD COLUMN IF NOT EXISTS trazos jsonb;           -- escritura original
ALTER TABLE intento_respuesta ADD COLUMN IF NOT EXISTS reconocido text;        -- lo que leyó el sistema antes de la confirmación
ALTER TABLE intento_respuesta ADD COLUMN IF NOT EXISTS confianza numeric(4,3);
DO $$ BEGIN
  ALTER TABLE intento_respuesta ADD CONSTRAINT intento_respuesta_una_forma_chk
    CHECK ((opcion_elegida IS NULL) <> (respuesta_texto IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
