require('./env');
const { run } = require('../scripts/migrate');

module.exports = async () => {
  await run({ reset: true, seed: true, databaseUrl: process.env.DATABASE_URL, silent: true });
};
