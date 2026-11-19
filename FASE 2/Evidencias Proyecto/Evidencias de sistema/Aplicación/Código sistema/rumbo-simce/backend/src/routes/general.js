// Rutas comunes a todos los roles: salud, perfil propio (HU-05 / HU-06) y ejes.
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { notFound, badRequest } = require('../lib/errors');
const { registrarEvento } = require('../lib/seguridad');

const router = express.Router();

router.get('/health', async (_req, res) => {
  await db.query('SELECT 1');
  res.json({ ok: true });
});

const adultoPublico = (r) => ({ id: Number(r.id), email: r.email, nombre: r.nombre, rol: r.rol });
const estudiantePublico = (r) => ({
  id: Number(r.id), apodo: r.apodo, avatar: r.avatar, curso_id: r.curso_id && Number(r.curso_id),
});

// HU-05 — Consultar el perfil de quien tiene la sesión (adulto o estudiante).
// Solo devuelve datos propios: el id sale del token, nunca de la URL.
router.get('/me', requireAuth, async (req, res) => {
  if (req.user.rol === 'estudiante') {
    const { rows } = await db.query('SELECT id, apodo, avatar, curso_id FROM estudiante WHERE id = $1', [req.user.id]);
    if (!rows[0]) throw notFound();
    return res.json({ rol: 'estudiante', estudiante: estudiantePublico(rows[0]) });
  }
  const { rows } = await db.query('SELECT id, email, nombre, rol FROM usuario WHERE id = $1 AND activo', [req.user.id]);
  if (!rows[0]) throw notFound();
  res.json({ rol: rows[0].rol, usuario: adultoPublico(rows[0]) });
});

// HU-06 — Editar el perfil. Los campos editables dependen del rol:
//   adulto     → nombre (el correo no se edita aquí: cambiarlo exige verificar el nuevo correo)
//   estudiante → avatar (el apodo lo administra su apoderado)
const editarAdulto = z.strictObject({ nombre: z.string().trim().min(2).max(120) });
const editarEstudiante = z.strictObject({ avatar: z.string().trim().min(2).max(40) });

router.patch(
  '/me',
  requireAuth,
  (req, res, next) => validate(req.user.rol === 'estudiante' ? editarEstudiante : editarAdulto)(req, res, next),
  async (req, res) => {
    if (req.user.rol === 'estudiante') {
      const { rows } = await db.query(
        'UPDATE estudiante SET avatar = $1 WHERE id = $2 RETURNING id, apodo, avatar, curso_id',
        [req.body.avatar, req.user.id],
      );
      if (!rows[0]) throw notFound();
      return res.json({ rol: 'estudiante', estudiante: estudiantePublico(rows[0]) });
    }
    const { rows } = await db.query(
      `UPDATE usuario SET nombre = $1, actualizado_en = now() WHERE id = $2 AND activo
       RETURNING id, email, nombre, rol`,
      [req.body.nombre, req.user.id],
    );
    if (!rows[0]) throw notFound();
    res.json({ rol: rows[0].rol, usuario: adultoPublico(rows[0]) });
  },
);

// HU-06 — Cambiar la contraseña (solo adultos), confirmando la actual.
const cambioClaveSchema = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(8, 'mínimo 8 caracteres').max(72),
});

router.post('/me/password', requireAuth, requireRole('apoderado', 'docente', 'admin'), validate(cambioClaveSchema),
  async (req, res) => {
    const { rows } = await db.query('SELECT password_hash FROM usuario WHERE id = $1 AND activo', [req.user.id]);
    if (!rows[0]) throw notFound();
    if (!(await bcrypt.compare(req.body.actual, rows[0].password_hash))) {
      throw badRequest('La contraseña actual no es correcta', 'CONTRASENA_ACTUAL_INCORRECTA');
    }
    if (req.body.actual === req.body.nueva) {
      throw badRequest('La nueva contraseña debe ser distinta de la actual', 'VALIDACION');
    }
    const hash = await bcrypt.hash(req.body.nueva, 10);
    await db.query('UPDATE usuario SET password_hash = $1, actualizado_en = now() WHERE id = $2', [hash, req.user.id]);
    await registrarEvento('contrasena_cambiada', { usuarioId: req.user.id });
    res.json({ mensaje: 'Contraseña actualizada' });
  });

// Ejes / islas del mapa (base para CU10)
router.get('/ejes', requireAuth, async (_req, res) => {
  const { rows } = await db.query('SELECT id, codigo, nombre, isla_nombre, orden FROM eje ORDER BY orden');
  res.json({ ejes: rows });
});

module.exports = router;
