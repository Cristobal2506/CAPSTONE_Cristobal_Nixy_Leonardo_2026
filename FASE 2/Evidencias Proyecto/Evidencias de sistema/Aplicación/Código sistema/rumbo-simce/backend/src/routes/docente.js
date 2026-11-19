// CU05 Crear curso (y listar estudiantes inscritos — base para CU17)
const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { notFound } = require('../lib/errors');
const { conCodigoUnico } = require('../lib/codigos');
const { idParam } = require('../lib/params');

const router = express.Router();
router.use(requireAuth, requireRole('docente'));

const cursoSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  establecimiento: z.string().trim().max(120).optional(),
  anio: z.number().int().min(2024).max(2100).default(new Date().getFullYear()),
});

router.post('/cursos', validate(cursoSchema), async (req, res) => {
  const { nombre, establecimiento, anio } = req.body;
  const curso = await conCodigoUnico(async (codigo) => {
    const { rows } = await db.query(
      `INSERT INTO curso (docente_id, nombre, establecimiento, anio, codigo_union)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, nombre, establecimiento, anio, codigo_union`,
      [req.user.id, nombre, establecimiento ?? null, anio, codigo],
    );
    return rows[0];
  });
  res.status(201).json({ curso: { ...curso, id: Number(curso.id) } });
});

router.get('/cursos', async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.id, c.nombre, c.establecimiento, c.anio, c.codigo_union, COUNT(e.id)::int AS estudiantes
     FROM curso c LEFT JOIN estudiante e ON e.curso_id = c.id
     WHERE c.docente_id = $1 GROUP BY c.id ORDER BY c.creado_en`,
    [req.user.id],
  );
  res.json({ cursos: rows.map((r) => ({ ...r, id: Number(r.id) })) });
});

router.get('/cursos/:id/estudiantes', async (req, res) => {
  const cursoId = idParam(req);
  const { rowCount } = await db.query('SELECT 1 FROM curso WHERE id = $1 AND docente_id = $2', [cursoId, req.user.id]);
  if (!rowCount) throw notFound('Curso no encontrado');
  // El docente ve apodo y avatar; nunca el código de acceso del estudiante.
  const { rows } = await db.query('SELECT id, apodo, avatar FROM estudiante WHERE curso_id = $1 ORDER BY apodo', [cursoId]);
  res.json({ estudiantes: rows.map((r) => ({ ...r, id: Number(r.id) })) });
});

// V12: revisión y autorización pedagógica de pruebas finales de unidad.
const evaluaciones = require('../lib/evaluaciones');
router.get('/evaluaciones/pendientes', async (req,res) => {
  res.json({pendientes: await evaluaciones.pendientesDocente(req.user.id)});
});
// v15: detalle de respuestas para decidir con fundamento (solo el docente del curso).
router.get('/evaluaciones/:id/detalle', async (req,res) => {
  res.json(await evaluaciones.detalleDocente(req.user.id,idParam(req)));
});
router.post('/evaluaciones/:id/revisar', validate(z.object({
  autorizar: z.boolean(), observacion: z.string().trim().min(1).max(500),
  unidadInicial:z.number().int().min(1).max(5).optional(),
})), async (req,res) => {
  res.json({revision: await evaluaciones.revisarDocente(req.user.id,idParam(req),req.body.autorizar,req.body.observacion,req.body.unidadInicial)});
});
module.exports = router;
