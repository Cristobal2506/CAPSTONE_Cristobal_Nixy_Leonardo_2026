-- CU20 / CU22 / CU23 / CU24 — Solicitudes de acompañamiento profesor-estudiante.
-- Solo la API puede emitir acceso a salas privadas. No se almacenan tokens en PostgreSQL.
CREATE TABLE videollamada (
  id BIGSERIAL PRIMARY KEY,
  estudiante_id BIGINT NOT NULL REFERENCES estudiante(id) ON DELETE CASCADE,
  docente_id BIGINT NOT NULL REFERENCES usuario(id),
  motivo VARCHAR(20) NOT NULL CHECK (motivo IN ('diagnostico', 'ayuda', 'cierre_nivel')),
  conjunto_id INTEGER REFERENCES conjunto(id),
  estado VARCHAR(15) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aceptada', 'finalizada', 'cancelada')),
  sala_nombre VARCHAR(80) UNIQUE,
  sala_url TEXT,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  aceptada_en TIMESTAMPTZ,
  finalizada_en TIMESTAMPTZ,
  CHECK ((estado <> 'aceptada') OR (sala_nombre IS NOT NULL AND sala_url IS NOT NULL))
);
-- Una sola solicitud abierta por niño: previene múltiples cámaras/llamadas superpuestas.
CREATE UNIQUE INDEX ux_videollamada_abierta ON videollamada(estudiante_id)
  WHERE estado IN ('pendiente', 'aceptada');
CREATE INDEX ix_videollamada_docente ON videollamada(docente_id, estado, creada_en DESC);
CREATE INDEX ix_videollamada_estudiante ON videollamada(estudiante_id, creada_en DESC);
