RUMBO SIMCE v16.4 - EVIDENCIA DE SCRIPTS POSTGRESQL

Origen: paquete final Rumbo_SIMCE_v16.4_proyecto.zip / backend.
Esta carpeta contiene los mismos scripts SQL que la aplicación; no se han modificado.

CONTENIDO
  migrations/  -> 14 migraciones ordenadas 001...014 (tablas, relaciones, evolución).
  seeds/       -> 11 semillas ordenadas 001...011 (contenido curricular y ajustes).
  scripts/migrate.js -> ejecutor usado realmente por backend/package.json.
  scripts/init-test-db.sql -> crea la BD de pruebas al iniciar el contenedor.

EJECUCION RECOMENDADA
1. Usar el proyecto ORIGINAL completo, no ejecutar esta carpeta aislada.
2. Instalar Node.js y Docker Desktop según la guía del proyecto.
3. En raíz del proyecto: docker compose up -d
4. En backend: copiar .env.example a .env y configurar DATABASE_URL.
5. En backend: npm install
6. En backend: npm run db:seed
   (ejecuta las migraciones pendientes y luego las semillas en orden).

ATENCION: npm run db:reset BORRA el esquema public y los datos existentes.
Usarlo solo en una base de demostración que se pueda descartar.

Base de datos: PostgreSQL 16. Docker expone el puerto 5433 local y 5432 dentro del contenedor.

Este paquete es EVIDENCIA DE CÓDIGO, no es un volcado de base de datos real.
No incluye credenciales privadas, información real de estudiantes ni datos de producción.
