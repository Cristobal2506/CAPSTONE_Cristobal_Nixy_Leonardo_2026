-- Rumbo SIMCE — esquema inicial (modelo de datos preliminar, Informe Fase 1, punto 3.8)
-- Principio rector: minimización de datos de menores (Ley 21.719).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────── Usuarios adultos ─────────────
CREATE TABLE usuario (
  id             BIGSERIAL PRIMARY KEY,
  email          VARCHAR(254) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  nombre         VARCHAR(120) NOT NULL,
  rol            VARCHAR(20) NOT NULL CHECK (rol IN ('apoderado','docente','admin')),
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE token_recuperacion (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expira_en   TIMESTAMPTZ NOT NULL,
  usado_en    TIMESTAMPTZ
);

-- ───────────── Cursos ─────────────
CREATE TABLE curso (
  id            BIGSERIAL PRIMARY KEY,
  docente_id    BIGINT NOT NULL REFERENCES usuario(id),
  nombre        VARCHAR(80) NOT NULL,          -- ej: "4° Básico A"
  establecimiento VARCHAR(120),
  anio          SMALLINT NOT NULL,
  codigo_union  CHAR(6) NOT NULL UNIQUE,       -- lo comparte el docente con los apoderados
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────── Estudiantes (sin email, sin RUT) ─────────────
CREATE TABLE estudiante (
  id             BIGSERIAL PRIMARY KEY,
  apodo          VARCHAR(40) NOT NULL,         -- solo nombre de pila o apodo
  avatar         VARCHAR(40) NOT NULL DEFAULT 'condor',
  codigo_acceso  CHAR(6) NOT NULL UNIQUE,
  pin_hash       TEXT NOT NULL,
  curso_id       BIGINT REFERENCES curso(id) ON DELETE SET NULL,
  nivel          VARCHAR(10) NOT NULL DEFAULT '4B',
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vínculo N a N apoderado–estudiante (RF11)
CREATE TABLE apoderado_estudiante (
  apoderado_id   BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  estudiante_id  BIGINT NOT NULL REFERENCES estudiante(id) ON DELETE CASCADE,
  parentesco     VARCHAR(30),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (apoderado_id, estudiante_id)
);

-- Consentimiento del apoderado (RF12). Trazable: no se borra, se revoca.
CREATE TABLE consentimiento (
  id              BIGSERIAL PRIMARY KEY,
  apoderado_id    BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  version_texto   VARCHAR(20) NOT NULL,
  otorgado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  revocado_en     TIMESTAMPTZ
);
CREATE INDEX idx_consentimiento_vigente ON consentimiento(apoderado_id) WHERE revocado_en IS NULL;

-- ───────────── Contenido ─────────────
CREATE TABLE eje (
  id           SMALLSERIAL PRIMARY KEY,
  codigo       VARCHAR(30) NOT NULL UNIQUE,
  nombre       VARCHAR(80) NOT NULL,
  isla_nombre  VARCHAR(80) NOT NULL,
  orden        SMALLINT NOT NULL UNIQUE
);

CREATE TABLE pregunta (
  id                 BIGSERIAL PRIMARY KEY,
  eje_id             SMALLINT NOT NULL REFERENCES eje(id),
  enunciado          TEXT NOT NULL,
  -- opciones: [{"clave":"A","texto":"...","tipo_error":null|"codigo_error"}]
  opciones           JSONB NOT NULL,
  respuesta_correcta CHAR(1) NOT NULL,
  dificultad         SMALLINT NOT NULL CHECK (dificultad BETWEEN 1 AND 5),
  estrategia         VARCHAR(20) NOT NULL DEFAULT 'numerica'
                     CHECK (estrategia IN ('numerica','visual','concreta','verbal')),
  explicacion        TEXT NOT NULL,
  activa             BOOLEAN NOT NULL DEFAULT TRUE,
  revisada_pedagogicamente BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_pregunta_eje_dificultad ON pregunta(eje_id, dificultad) WHERE activa;

-- ───────────── Juego y trazabilidad del aprendizaje ─────────────
CREATE TABLE sesion (
  id             BIGSERIAL PRIMARY KEY,
  estudiante_id  BIGINT NOT NULL REFERENCES estudiante(id) ON DELETE CASCADE,
  eje_id         SMALLINT NOT NULL REFERENCES eje(id),
  iniciada_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  terminada_en   TIMESTAMPTZ,
  dificultad_inicial SMALLINT NOT NULL DEFAULT 2
);
CREATE INDEX idx_sesion_estudiante ON sesion(estudiante_id, iniciada_en DESC);

CREATE TABLE respuesta (
  id              BIGSERIAL PRIMARY KEY,
  sesion_id       BIGINT NOT NULL REFERENCES sesion(id) ON DELETE CASCADE,
  pregunta_id     BIGINT NOT NULL REFERENCES pregunta(id),
  opcion_elegida  CHAR(1) NOT NULL,
  es_correcta     BOOLEAN NOT NULL,
  tiempo_ms       INTEGER,
  tipo_error      VARCHAR(40),
  respondida_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_respuesta_sesion ON respuesta(sesion_id);

CREATE TABLE patron_error (
  id                  BIGSERIAL PRIMARY KEY,
  estudiante_id       BIGINT NOT NULL REFERENCES estudiante(id) ON DELETE CASCADE,
  eje_id              SMALLINT NOT NULL REFERENCES eje(id),
  tipo_error          VARCHAR(40) NOT NULL,
  ocurrencias         INTEGER NOT NULL DEFAULT 1,
  estrategia_aplicada VARCHAR(20),
  detectado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resuelto_en         TIMESTAMPTZ,
  UNIQUE (estudiante_id, eje_id, tipo_error)
);

CREATE TABLE recompensa (
  id             BIGSERIAL PRIMARY KEY,
  estudiante_id  BIGINT NOT NULL REFERENCES estudiante(id) ON DELETE CASCADE,
  tipo           VARCHAR(30) NOT NULL,       -- 'pluma', 'isla_completada', ...
  descripcion    VARCHAR(160) NOT NULL,
  obtenida_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
