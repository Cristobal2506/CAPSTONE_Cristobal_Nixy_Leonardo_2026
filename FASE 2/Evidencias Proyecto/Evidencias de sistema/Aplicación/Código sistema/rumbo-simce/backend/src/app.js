const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', require('./routes/general'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/apoderado', require('./routes/apoderado'));
  app.use('/api/docente', require('./routes/docente'));
  app.use('/api/estudiante', require('./routes/estudiante'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/videollamadas', require('./routes/videollamadas'));
  app.use('/api/evaluaciones', require('./routes/evaluaciones'));
  app.use('/api/notificaciones', require('./routes/notificaciones'));
  app.use('/api/progreso', require('./routes/progreso-v14'));
  app.use('/api/reconocimiento', require('./routes/reconocimiento')); // v16: lectura de números escritos a mano

  app.use((_req, res) => res.status(404).json({ error: { code: 'RUTA_NO_ENCONTRADA', message: 'Ruta no encontrada' } }));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
