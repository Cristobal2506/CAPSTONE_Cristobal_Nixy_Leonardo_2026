# Rumbo SIMCE — v14

Aplicación académica de Matemática de cuarto básico que combina **32 lecciones** de práctica progresiva (320 ejercicios originales), diagnóstico de entrada, **cinco pruebas de unidad**, ensayo final, revisión y autorización docente y videoconferencia **LiveKit integrada en una sola APK Android**. Se presenta como proyecto de título; no está diseñado para producción.

## Guía para instalar desde cero

Lee la **guía autónoma para Windows** [`docs/guia-instalacion-y-pruebas-v14.md`](docs/guia-instalacion-y-pruebas-v14.md) o su PDF del mismo nombre. Incluye instalación de Node.js 22, Git, Docker Desktop/WSL2, PostgreSQL, JDK 21 y configuración detallada de `JAVA_HOME`, `Path`, `ANDROID_HOME`, Android Studio/SDK, LiveKit Cloud gratuito, IPv4 propia, compilación de una APK y prueba entre dos teléfonos.

**Windows:** descomprime en una ruta corta, por ejemplo `C:\Rumbo\v14\rumbo-simce`, para evitar fallos de Ninja/CMake por rutas mayores de 260 caracteres. La compilación utiliza JDK 21 mediante `gradle-daemon-jvm.properties` y `npm run prebuild:android`.

**Código fuente liviano:** no se incluyen paquetes instalados (`node_modules`), archivos `.env` con secretos, carpeta `android/` generada ni APK. Cada integrante instalará dependencias con `npm install` en `backend` y en `mobile`.

## Principales mejoras de la v14

- **Progreso y reportes:** la flecha verde ↗ abre el progreso personal del estudiante o la lista de estudiantes vinculados a docentes/apoderados; el backend restringe accesos por vínculo. El panel muestra estado de cada lección e historial de evaluaciones. Las calificaciones pendientes **no** se revelan hasta la revisión del profesor.
- **Notificaciones:** abrir la campanita 🔔 limpia inmediatamente el contador marcando los avisos como leídos, sin borrar su historial.
- **Cabecera:** un botón circular rojo **×**, a la derecha de la campanita, permite cerrar sesión con confirmación. El botón grande de salida del Camino se retiró.
- **Camino compacto:** tres botones juntos en una fila inferior —Tanda, Pruebas y Profesor— en lugar de tres botones verticales grandes.
- **Más práctica:** 15 lecciones nuevas (tres por unidad) y 150 ejercicios variados; **32 lecciones/320 ejercicios** en total. Las evaluaciones existentes y LiveKit siguen sin alterarse.

## Estructura

- `backend/`: Express, PostgreSQL, rutas `/api/progreso/*`, `/api/notificaciones/*`, migraciones, semillas y tests.
- `mobile/`: Expo SDK 57, React Native 0.86.3, TypeScript, LiveKit; pantallas `MiCamino`, `ProgresoV14` y cabecera común.
- `docs/`: manual PDF/Markdown, matriz diagnóstica previa y registro de cambios de v14.

Para validar sin base de datos: `npm run verificar:v14` en ambas carpetas. Para pruebas completas en `backend` se necesita PostgreSQL y `npm run test:v14`. Para compilar usa `npm run prebuild:android` en `mobile` y Gradle con JDK 21.

**Protección de datos:** nunca compartas claves de LiveKit, tokens o `.env`; usa únicamente cuentas ficticias en la demostración. Los contenidos originales se basan en los objetivos de Matemática del temario UCE de validación de estudios (4.º básico), no en preguntas oficiales SIMCE ni en reproducciones de cuadernillos Kumon.

**Estado:** los verificadores de contenido y estructura se ejecutaron; la APK v14 y los reportes con PostgreSQL necesitan validación en el computador y los dos teléfonos del equipo.
