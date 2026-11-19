const config = require('./config');
const { createApp } = require('./app');

createApp().listen(config.port, () => {
  console.log(`Rumbo SIMCE API escuchando en http://localhost:${config.port}/api`);
});
