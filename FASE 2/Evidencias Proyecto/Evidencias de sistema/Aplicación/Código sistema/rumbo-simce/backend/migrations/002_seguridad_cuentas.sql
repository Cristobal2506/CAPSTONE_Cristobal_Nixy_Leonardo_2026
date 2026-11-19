-- Sprint 1 — Seguridad de cuentas
--   HU-04: bloqueo temporal tras intentos fallidos (adultos y estudiantes) y registro del evento.
--   CU07:  la recuperación pasa a usar un código de 6 dígitos enviado por correo,
--          con límite de intentos por código.

ALTER TABLE usuario
  ADD COLUMN intentos_fallidos SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN bloqueado_hasta   TIMESTAMPTZ;

ALTER TABLE estudiante
  ADD COLUMN intentos_fallidos SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN bloqueado_hasta   TIMESTAMPTZ;

-- Con códigos cortos dos usuarios pueden recibir el mismo código: el hash deja de ser único
-- (la búsqueda siempre se hace por usuario_id).
ALTER TABLE token_recuperacion DROP CONSTRAINT token_recuperacion_token_hash_key;
ALTER TABLE token_recuperacion
  ADD COLUMN intentos  SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN creado_en TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX idx_token_recuperacion_usuario ON token_recuperacion(usuario_id, creado_en DESC);

-- Bitácora de eventos de acceso (trazabilidad). No guarda IP ni dispositivo: minimización de datos.
CREATE TABLE evento_acceso (
  id             BIGSERIAL PRIMARY KEY,
  tipo           VARCHAR(40) NOT NULL CHECK (tipo IN (
                   'login_ok', 'login_fallido', 'bloqueo',
                   'recuperacion_solicitada', 'contrasena_restablecida', 'contrasena_cambiada')),
  usuario_id     BIGINT REFERENCES usuario(id) ON DELETE CASCADE,
  estudiante_id  BIGINT REFERENCES estudiante(id) ON DELETE CASCADE,
  ocurrido_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (usuario_id IS NOT NULL OR estudiante_id IS NOT NULL)
);
CREATE INDEX idx_evento_acceso_usuario ON evento_acceso(usuario_id, ocurrido_en DESC);
CREATE INDEX idx_evento_acceso_estudiante ON evento_acceso(estudiante_id, ocurrido_en DESC);
