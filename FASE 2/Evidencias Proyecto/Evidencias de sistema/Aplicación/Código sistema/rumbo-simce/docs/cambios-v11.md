# Rumbo SIMCE v11 — Bitácora técnica

**Origen:** ZIP original de v10b. El usuario reportó cambios locales en Windows para obtener un APK v10b compilado; esos archivos locales modificados **no estaban en el ZIP**, por lo cual no se copiaron ciegamente. Se recrea el ajuste Gradle JDK 21 mediante script reproducible.

## Diferencias

- Se eliminaron por completo módulo local `jitsi-native` y plugin `withJitsiAndroid` (y la dependencia Maven Jitsi que ocasionaba `UnsatisfiedLinkError` de JSI al iniciar v10b).
- Se añadieron paquetes y plugins LiveKit React Native/WebRTC a `mobile/package.json` y `mobile/app.json`.
- `mobile/index.ts` inicializa `registerGlobals()` antes de cargar `App`.
- `mobile/src/screens/SalaLiveKit.tsx` integra videos y controles de cámara/micrófono.
- `mobile/src/screens/Videollamadas.tsx` consume JWT temporal de la API y muestra pantalla de llamada dentro de Rumbo SIMCE.
- El backend reemplazó proveedor Jitsi por emisión de JWT HS256 con grant `video.roomJoin`, `video.room`, `video.canPublish`, `video.canSubscribe`, identidad exclusiva para alumno/docente. Emplea `jsonwebtoken` ya existente en backend. La URL y secretos proceden del `.env` del backend.
- Se añadió migración 008 para finalizar solicitudes Jitsi heredadas aceptadas.
- Se actualizaron tests unitarios/integración para proveedor LiveKit simulado.
- `npm run prebuild:android` recrea Android y ejecuta `preparar-android-v11.cjs` para recuperar `toolchainVersion=21` (evitar Gradle Daemon Java 25).
- Se omitió `mobile/package-lock.json` deliberadamente porque el registro npm no está accesible en el entorno de generación; `npm install` crea ese archivo antes de compilar.

## Estado comprobado

- Verificador `mobile/scripts/verificar-v11.cjs`: aprobado.
- Sintaxis Node de backend y tests: aprobada.
- Ejecución npm install/Jest/typecheck completo: **no verificada** por falta de acceso a registry.npmjs.org.
- `expo prebuild` / compilación Gradle / APK y video real: **no verificados** por no disponer de Android SDK/descarga de dependencias.
- El SDK Expo oficial de LiveKit admite Expo con builds de desarrollo, pero el ecosistema de plugins WebRTC consultado no certifica expresamente Expo SDK 57 en su tabla de versiones; no declarar compatibilidad demostrada.

## Limitaciones conocidas

- El token previamente emitido puede seguir utilizándose hasta expirar (10 min) incluso si la solicitud fue finalizada; la conexión ya establecida no se expulsa de manera automática.
- Ambos participantes deben salir manualmente.
- Cuenta Cloud gratuita sujeta a límites vigentes.
- Demo académica con adultos simulando perfiles; no diseñada para producción con menores.
