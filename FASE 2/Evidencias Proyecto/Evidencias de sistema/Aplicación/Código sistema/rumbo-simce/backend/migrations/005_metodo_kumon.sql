-- Semana 5 — Motor de aprendizaje Kumon (2.ª revisión del cliente)
--   CU18 secuencia de conjuntos de hojas · CU09 tanda diaria · CU11 acierto y tiempo por intento
--   CU12 corregir hasta dejar todo correcto · CU13 avanzar / repetir / retroceder · CU10 progresión lineal
--
-- Capa de método (Kumon) = CÓMO se practica: secuencia fija nivel → conjunto → hoja.
-- Capa de contenido (SIMCE) = QUÉ se practica: cada conjunto lleva su objetivo de aprendizaje y sus
-- ejercicios salen del banco (`pregunta`, CU08). El formato definitivo llega con los facsímiles del cliente.

-- Niveles de la progresión lineal (reemplazan a las islas en el MVP).
CREATE TABLE nivel (
  id         SMALLSERIAL PRIMARY KEY,
  codigo     VARCHAR(20) NOT NULL UNIQUE,          -- ej: 'NUM-N1'
  nombre     VARCHAR(80) NOT NULL,
  eje_id     SMALLINT NOT NULL REFERENCES eje(id), -- el MVP parte solo con Números y operaciones
  orden      SMALLINT NOT NULL UNIQUE
);

-- Conjunto de hojas = la tanda diaria. Siempre la misma dosis; si no se alcanza el estándar se repite el mismo.
CREATE TABLE conjunto (
  id                   SERIAL PRIMARY KEY,
  codigo               VARCHAR(20) NOT NULL UNIQUE,      -- ej: 'NUM-N1-C1'
  nivel_id             SMALLINT NOT NULL REFERENCES nivel(id),
  orden                SMALLINT NOT NULL,                -- orden dentro del nivel
  titulo               VARCHAR(120) NOT NULL,
  objetivo_aprendizaje VARCHAR(200) NOT NULL,            -- capa SIMCE: qué se practica
  tiempo_estandar_seg  INTEGER NOT NULL CHECK (tiempo_estandar_seg > 0),
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (nivel_id, orden)
);

-- Hoja: parte con un ejemplo resuelto (nadie explica antes) y sigue con sus ejercicios.
CREATE TABLE hoja (
  id                  SERIAL PRIMARY KEY,
  conjunto_id         INTEGER NOT NULL REFERENCES conjunto(id) ON DELETE CASCADE,
  orden               SMALLINT NOT NULL,
  ejemplo_enunciado   TEXT NOT NULL,
  ejemplo_resolucion  TEXT NOT NULL,                     -- pasos del ejemplo resuelto
  UNIQUE (conjunto_id, orden)
);

CREATE TABLE hoja_ejercicio (
  hoja_id      INTEGER NOT NULL REFERENCES hoja(id) ON DELETE CASCADE,
  pregunta_id  BIGINT NOT NULL REFERENCES pregunta(id),
  orden        SMALLINT NOT NULL,
  PRIMARY KEY (hoja_id, pregunta_id),
  UNIQUE (hoja_id, orden)
);

-- Dónde va cada estudiante en la secuencia.
CREATE TABLE estudiante_posicion (
  estudiante_id            BIGINT PRIMARY KEY REFERENCES estudiante(id) ON DELETE CASCADE,
  conjunto_id              INTEGER NOT NULL REFERENCES conjunto(id),
  punto_partida_id         INTEGER NOT NULL REFERENCES conjunto(id),  -- lo fijará el diagnóstico (CU20)
  cierre_nivel_pendiente   BOOLEAN NOT NULL DEFAULT FALSE,            -- espera la autorización del profesor (CU24)
  requiere_profesor        BOOLEAN NOT NULL DEFAULT FALSE,            -- repitió sin alcanzar el estándar (CU22)
  actualizado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cada vez que el estudiante hace un conjunto (CU11). El tiempo se mide en el servidor:
-- desde que empieza hasta que entrega la primera vuelta completa.
CREATE TABLE intento (
  id                     BIGSERIAL PRIMARY KEY,
  estudiante_id          BIGINT NOT NULL REFERENCES estudiante(id) ON DELETE CASCADE,
  conjunto_id            INTEGER NOT NULL REFERENCES conjunto(id),
  repeticion             SMALLINT NOT NULL,          -- 1 = primera vez que hace este conjunto
  ronda                  SMALLINT NOT NULL DEFAULT 1, -- 1 = primera vuelta; 2+ = correcciones (CU12)
  iniciado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
  primera_revision_en    TIMESTAMPTZ,
  terminado_en           TIMESTAMPTZ,                 -- cuando quedó todo correcto
  total                  SMALLINT NOT NULL,
  correctas_primera      SMALLINT,
  tiempo_seg             INTEGER,
  tiempo_estandar_seg    INTEGER NOT NULL,            -- copia del estándar vigente al empezar
  cumple_estandar        BOOLEAN,
  decision               VARCHAR(12) CHECK (decision IN ('avanzar', 'repetir', 'retroceder'))
);
CREATE INDEX idx_intento_estudiante ON intento(estudiante_id, iniciado_en DESC);
CREATE INDEX idx_intento_abierto ON intento(estudiante_id) WHERE terminado_en IS NULL;

CREATE TABLE intento_respuesta (
  intento_id      BIGINT NOT NULL REFERENCES intento(id) ON DELETE CASCADE,
  pregunta_id     BIGINT NOT NULL REFERENCES pregunta(id),
  ronda           SMALLINT NOT NULL,
  opcion_elegida  CHAR(1) NOT NULL,
  es_correcta     BOOLEAN NOT NULL,
  tipo_error      VARCHAR(40) REFERENCES tipo_error(codigo),
  respondida_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (intento_id, pregunta_id, ronda)
);
