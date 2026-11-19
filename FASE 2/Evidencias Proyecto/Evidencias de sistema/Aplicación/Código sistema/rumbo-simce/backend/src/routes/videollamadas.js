// Solicitud y acceso a videoconferencias de diagnóstico, apoyo y cierre de nivel.
const express = require('express');
const { z } = require('zod');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idParam } = require('../lib/params');
const videollamadas = require('../lib/videollamadas');

const router = express.Router();
router.use(requireAuth, requireRole('estudiante', 'docente'));
router.get('/opciones', requireRole('estudiante'), async (req, res) => {
  res.json({ opciones: await videollamadas.opciones(req.user.id) });
});
router.get('/', async (req, res) => {
  const solicitudes = req.user.rol === 'estudiante'
    ? await videollamadas.listarEstudiante(req.user.id)
    : await videollamadas.listarDocente(req.user.id);
  res.json({ solicitudes });
});
router.post('/', requireRole('estudiante'), validate(z.object({
  motivo: z.enum(['diagnostico', 'ayuda', 'cierre_nivel']),
})), async (req, res) => {
  res.status(201).json({ solicitud: await videollamadas.solicitar(req.user.id, req.body.motivo) });
});
router.post('/:id/aceptar', requireRole('docente'), async (req, res) => {
  res.json({ solicitud: await videollamadas.aceptar(idParam(req), req.user.id) });
});
router.get('/:id/acceso', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await videollamadas.acceso(idParam(req), req.user));
});
router.post('/:id/cancelar', requireRole('estudiante'), async (req, res) => {
  res.json({ solicitud: await videollamadas.terminar(idParam(req), req.user, true) });
});
router.post('/:id/finalizar', async (req, res) => {
  res.json({ solicitud: await videollamadas.terminar(idParam(req), req.user) });
});
module.exports = router;
