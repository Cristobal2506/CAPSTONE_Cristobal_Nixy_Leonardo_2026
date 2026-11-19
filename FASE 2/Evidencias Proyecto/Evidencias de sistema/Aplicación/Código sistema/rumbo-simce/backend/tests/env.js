require('dotenv').config({ quiet: true });
// Las pruebas usan SIEMPRE una base separada, nunca la de desarrollo.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://rumbo:rumbo@localhost:5433/rumbo_simce_test';
